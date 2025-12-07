-- Contract Phases Management Tables
-- This extends the contract management system with phase tracking capabilities

-- Create contract_phases table
CREATE TABLE IF NOT EXISTS contract_phases (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'delayed', 'cancelled')),
  tasks JSONB DEFAULT '[]'::jsonb, -- Array of task objects with completion status
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER, -- in days
  actual_duration INTEGER, -- calculated field
  notes TEXT,
  assigned_team JSONB DEFAULT '[]'::jsonb, -- Array of user IDs assigned to this phase
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_id, phase_number)
);

-- Create phase_comments table for collaboration
CREATE TABLE IF NOT EXISTS phase_comments (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER REFERENCES contract_phases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'general' CHECK (comment_type IN ('general', 'issue', 'milestone', 'feedback')),
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of file references
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create phase_milestones table
CREATE TABLE IF NOT EXISTS phase_milestones (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER REFERENCES contract_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create phase_resources table for file/document management
CREATE TABLE IF NOT EXISTS phase_resources (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER REFERENCES contract_phases(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'image', 'drawing', 'specification', 'report', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  description TEXT,
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_phases_contract_id ON contract_phases(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_phases_status ON contract_phases(status);
CREATE INDEX IF NOT EXISTS idx_contract_phases_phase_number ON contract_phases(contract_id, phase_number);

CREATE INDEX IF NOT EXISTS idx_phase_comments_phase_id ON phase_comments(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_comments_user_id ON phase_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_phase_comments_created_at ON phase_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_phase_milestones_phase_id ON phase_milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_milestones_status ON phase_milestones(status);
CREATE INDEX IF NOT EXISTS idx_phase_milestones_due_date ON phase_milestones(due_date);

CREATE INDEX IF NOT EXISTS idx_phase_resources_phase_id ON phase_resources(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_resources_type ON phase_resources(resource_type);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_contract_phases_updated_at
  BEFORE UPDATE ON contract_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phase_comments_updated_at
  BEFORE UPDATE ON phase_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phase_milestones_updated_at
  BEFORE UPDATE ON phase_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate phase duration when phase is completed
CREATE OR REPLACE FUNCTION calculate_phase_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.start_date IS NOT NULL THEN
    NEW.actual_duration = EXTRACT(EPOCH FROM (NEW.end_date - NEW.start_date)) / 86400; -- in days
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_phase_duration_trigger
  BEFORE UPDATE ON contract_phases
  FOR EACH ROW EXECUTE FUNCTION calculate_phase_duration();

-- Function to auto-progress contract status based on phases
CREATE OR REPLACE FUNCTION update_contract_status_from_phases()
RETURNS TRIGGER AS $$
DECLARE
  contract_phases_count INTEGER;
  completed_phases_count INTEGER;
  contract_record RECORD;
BEGIN
  -- Get contract phases info
  SELECT COUNT(*) INTO contract_phases_count
  FROM contract_phases 
  WHERE contract_id = NEW.contract_id;
  
  SELECT COUNT(*) INTO completed_phases_count
  FROM contract_phases 
  WHERE contract_id = NEW.contract_id AND status = 'completed';
  
  -- Get current contract info
  SELECT * INTO contract_record
  FROM contracts 
  WHERE id = NEW.contract_id;
  
  -- Update contract status based on phase progress
  IF completed_phases_count = contract_phases_count AND contract_phases_count > 0 THEN
    -- All phases completed - mark contract as completed
    UPDATE contracts 
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.contract_id AND status NOT IN ('completed', 'expired');
  ELSIF completed_phases_count > 0 AND contract_record.status IN ('approved', 'pending') THEN
    -- Some phases completed - mark as in progress
    UPDATE contracts 
    SET status = 'in_progress', updated_at = NOW()
    WHERE id = NEW.contract_id AND status NOT IN ('in_progress', 'completed', 'expired');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_status_from_phases_trigger
  AFTER UPDATE ON contract_phases
  FOR EACH ROW EXECUTE FUNCTION update_contract_status_from_phases();

-- RPC function to get contract phase analytics
CREATE OR REPLACE FUNCTION get_contract_phase_analytics(p_contract_id INTEGER DEFAULT NULL)
RETURNS TABLE(
  total_phases INTEGER,
  completed_phases INTEGER,
  active_phases INTEGER,
  delayed_phases INTEGER,
  overall_progress DECIMAL,
  estimated_total_duration INTEGER,
  actual_total_duration INTEGER,
  budget_utilization DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_phases,
    COUNT(CASE WHEN cp.status = 'completed' THEN 1 END)::INTEGER as completed_phases,
    COUNT(CASE WHEN cp.status = 'active' THEN 1 END)::INTEGER as active_phases,
    COUNT(CASE WHEN cp.status = 'delayed' THEN 1 END)::INTEGER as delayed_phases,
    COALESCE(AVG(cp.progress), 0)::DECIMAL as overall_progress,
    COALESCE(SUM(cp.estimated_duration), 0)::INTEGER as estimated_total_duration,
    COALESCE(SUM(cp.actual_duration), 0)::INTEGER as actual_total_duration,
    CASE 
      WHEN SUM(cp.budget_allocated) > 0 THEN 
        (SUM(cp.budget_spent) / SUM(cp.budget_allocated) * 100)::DECIMAL
      ELSE 0::DECIMAL
    END as budget_utilization
  FROM contract_phases cp
  WHERE (p_contract_id IS NULL OR cp.contract_id = p_contract_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON contract_phases TO authenticated;
GRANT ALL ON phase_comments TO authenticated;
GRANT ALL ON phase_milestones TO authenticated;
GRANT ALL ON phase_resources TO authenticated;

GRANT EXECUTE ON FUNCTION get_contract_phase_analytics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_phase_duration() TO authenticated;
GRANT EXECUTE ON FUNCTION update_contract_status_from_phases() TO authenticated;

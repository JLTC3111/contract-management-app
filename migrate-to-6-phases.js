/**
 * Migration Script: Update all contracts to 6-phase model
 * 
 * This script adds phases 4, 5, and 6 to all contracts that only have 3 phases.
 * Run with: node migrate-to-6-phases.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default 6-phase structure
const DEFAULT_PHASES = [
  {
    number: 1,
    name: 'Tender Documents',
    nameKey: 'phaseTimeline.phase1.name',
    description: 'Proposal, bidding documents, and tender submissions',
    descriptionKey: 'phaseTimeline.phase1.description',
    tasks: [
      { text: 'Prepare and review bid documents', textKey: 'phaseManagement.tasks.prepareBid' },
      { text: 'Submit tender proposal', textKey: 'phaseManagement.tasks.submitBid' }
    ]
  },
  {
    number: 2,
    name: 'Legal Documents',
    nameKey: 'phaseTimeline.phase2.name',
    description: 'Decisions, assignments, and legal documentation',
    descriptionKey: 'phaseTimeline.phase2.description',
    tasks: [
      { text: 'Obtain legal approvals', textKey: 'phaseManagement.tasks.legalApprovals' },
      { text: 'Process assignment decision', textKey: 'phaseManagement.tasks.assignmentDecision' }
    ]
  },
  {
    number: 3,
    name: 'Joint Venture Documents',
    nameKey: 'phaseTimeline.phase3.name',
    description: 'Consortium agreements and linked documentation',
    descriptionKey: 'phaseTimeline.phase3.description',
    tasks: [
      { text: 'Draft joint venture agreement', textKey: 'phaseManagement.tasks.jvAgreement' },
      { text: 'Sign off consortium documents', textKey: 'phaseManagement.tasks.jvSignoff' }
    ]
  },
  {
    number: 4,
    name: 'Contract & Appendices',
    nameKey: 'phaseTimeline.phase4.name',
    description: 'Main contract, amendments, and supplemental agreements',
    descriptionKey: 'phaseTimeline.phase4.description',
    tasks: [
      { text: 'Draft contract documents', textKey: 'phaseManagement.tasks.contractDraft' },
      { text: 'Contract review and negotiation', textKey: 'phaseManagement.tasks.contractReview' },
      { text: 'Legal review and approval', textKey: 'phaseManagement.tasks.legalReview' },
      { text: 'Sign contract and appendices', textKey: 'phaseManagement.tasks.contractSign' },
      { text: 'Distribute signed copies', textKey: 'phaseManagement.tasks.distributeCopies' },
      { text: 'Archive contract documents', textKey: 'phaseManagement.tasks.archiveContract' }
    ]
  },
  {
    number: 5,
    name: 'Project Group Files',
    nameKey: 'phaseTimeline.phase5.name',
    description: 'Project team assignments and documentation',
    descriptionKey: 'phaseTimeline.phase5.description',
    tasks: [
      { text: 'Assign project team members', textKey: 'phaseManagement.tasks.assignTeam' },
      { text: 'Kickoff meeting and orientation', textKey: 'phaseManagement.tasks.kickoffMeeting' },
      { text: 'Create detailed project plan', textKey: 'phaseManagement.tasks.createProjectPlan' },
      { text: 'Setup communication channels', textKey: 'phaseManagement.tasks.setupCommunication' },
      { text: 'Track internal deliverables', textKey: 'phaseManagement.tasks.internalDeliverables' },
      { text: 'Maintain project documentation', textKey: 'phaseManagement.tasks.projectDocumentation' }
    ]
  },
  {
    number: 6,
    name: 'Owner Payment Documents',
    nameKey: 'phaseTimeline.phase6.name',
    description: 'Settlement proposals, invoices, and payment records',
    descriptionKey: 'phaseTimeline.phase6.description',
    tasks: [
      { text: 'Prepare payment proposal', textKey: 'phaseManagement.tasks.paymentProposal' },
      { text: 'Generate invoices', textKey: 'phaseManagement.tasks.invoiceGeneration' },
      { text: 'Track payment status', textKey: 'phaseManagement.tasks.paymentTracking' },
      { text: 'Payment reconciliation', textKey: 'phaseManagement.tasks.paymentReconciliation' },
      { text: 'Invoice and project handover', textKey: 'phaseManagement.tasks.invoiceAndHandover' },
      { text: 'Financial closure', textKey: 'phaseManagement.tasks.financialClosure' }
    ]
  }
];

async function migrateContracts() {
  console.log('🚀 Starting migration to 6-phase model...\n');

  try {
    // Get all unique contract IDs from contract_phases table
    const { data: allPhases, error: fetchError } = await supabase
      .from('contract_phases')
      .select('contract_id, phase_number')
      .order('contract_id')
      .order('phase_number');

    if (fetchError) {
      throw new Error(`Failed to fetch phases: ${fetchError.message}`);
    }

    // Group phases by contract_id
    const contractPhaseMap = {};
    allPhases.forEach(phase => {
      if (!contractPhaseMap[phase.contract_id]) {
        contractPhaseMap[phase.contract_id] = [];
      }
      contractPhaseMap[phase.contract_id].push(phase.phase_number);
    });

    const contractIds = Object.keys(contractPhaseMap);
    console.log(`📊 Found ${contractIds.length} contracts with phases\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const contractId of contractIds) {
      const existingPhaseNumbers = contractPhaseMap[contractId];
      
      // Check if contract has all 6 phases
      if (existingPhaseNumbers.length >= 6) {
        console.log(`✓ Contract ${contractId}: Already has ${existingPhaseNumbers.length} phases - skipping`);
        skippedCount++;
        continue;
      }

      // Find missing phases
      const missingPhaseNumbers = [];
      for (let i = 1; i <= 6; i++) {
        if (!existingPhaseNumbers.includes(i)) {
          missingPhaseNumbers.push(i);
        }
      }

      if (missingPhaseNumbers.length === 0) {
        skippedCount++;
        continue;
      }

      console.log(`📝 Contract ${contractId}: Adding phases ${missingPhaseNumbers.join(', ')}...`);

      // Create missing phases
      const missingPhases = missingPhaseNumbers.map(phaseNum => {
        const template = DEFAULT_PHASES.find(p => p.number === phaseNum);
        return {
          contract_id: contractId,
          phase_number: phaseNum,
          name: template.name,
          description: template.description,
          status: 'pending',
          tasks: template.tasks.map(task => ({
            id: crypto.randomUUID(),
            text: task.text,
            textKey: task.textKey,
            completed: false,
            assigned_to: null,
            due_date: null,
            notes: '',
            created_at: new Date().toISOString()
          })),
          start_date: null,
          end_date: null,
          progress: 0
        };
      });

      // Insert missing phases
      const { error: insertError } = await supabase
        .from('contract_phases')
        .insert(missingPhases);

      if (insertError) {
        console.error(`❌ Error updating contract ${contractId}:`, insertError.message);
        errorCount++;
      } else {
        console.log(`✅ Contract ${contractId}: Successfully added ${missingPhaseNumbers.length} phases`);
        updatedCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Updated: ${updatedCount} contracts`);
    console.log(`⏭️  Skipped: ${skippedCount} contracts (already have 6 phases)`);
    console.log(`❌ Errors:  ${errorCount} contracts`);
    console.log('='.repeat(50));
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check the logs above.');
    }

  } catch (error) {
    console.error('\n💥 Fatal error during migration:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateContracts();

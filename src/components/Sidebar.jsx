const Sidebar = () => {
    return (
      <aside style={{ padding: '1rem', width: '200px', background: '#f1f1f1' }}>
        <h2>Contracts</h2>
        <nav>
          <ul>
            <li><a href="/">Dashboard</a></li>
            <li><a href="/approvals">Approvals</a></li>
          </ul>
        </nav>
      </aside>
    );
  };
  
  export default Sidebar;
  
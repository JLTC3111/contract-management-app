import { useNavigate } from 'react-router-dom';

const ContractTable = ({ contracts }) => {
  const navigate = useNavigate();

  return (
    <table className='contract-table'>
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Version</th>
          <th>Last Updated</th>
          <th>Author</th>
        </tr>
      </thead>
      <tbody>
        {contracts.map(contract => (
          <tr
            key={contract.id}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/contracts/${contract.id}`)}
          >
            <td>{contract.title}</td>
            <td>{contract.status}</td>
            <td>{contract.version}</td>
            <td>{new Date(contract.updated_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

  
  export default ContractTable;
  
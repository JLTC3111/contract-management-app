// Approvals.jsx
import { useEffect, useState } from "react";
import { supabase } from '../utils/supaBaseClient';
import { useParams } from "react-router-dom";

const Approvals = ({ user }) => {
  const { contractId } = useParams(); // assumes URL like /contracts/:contractId
  const [approval, setApproval] = useState(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApproval = async () => {
    const { data, error } = await supabase
      .from("approvals")
      .select("*")
      .eq("contract_id", contractId)
      .eq("approver_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") console.error(error);
    setApproval(data);
    setComments(data?.comments || "");
    setLoading(false);
  };

  useEffect(() => {
    fetchApproval();
  }, [contractId, user.id]);

  const updateApproval = async (status) => {
    setLoading(true);

    const payload = {
      contract_id: contractId,
      approver_id: user.id,
      status,
      comments,
    };

    const { error } = approval
      ? await supabase.from("contract_approvals").update(payload).eq("id", approval.id)
      : await supabase.from("contract_approvals").insert(payload);

    if (error) console.error(error);
    await fetchApproval();
  };

  if (loading) return <p>Loading approval status...</p>;

  return (
    <div className="p-4 border rounded shadow bg-white max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Approval Workflow</h2>
      <p>
        <strong>Status:</strong>{" "}
        <span className={`font-semibold ${approval?.status === "approved" ? "text-green-600" : approval?.status === "rejected" ? "text-red-600" : "text-yellow-600"}`}>
          {approval?.status || "Pending"}
        </span>
      </p>
      <textarea
        className="mt-4 w-full p-2 border rounded"
        rows={4}
        placeholder="Optional comments"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />

      {user.role === "approver" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => updateApproval("approved")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => updateApproval("rejected")}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export default Approvals;

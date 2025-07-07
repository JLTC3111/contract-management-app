**Contract Manager App Manual**

Welcome to the Contract Manager App for PeaceCord! This guide will walk you through the key features and how to use them effectively.

---

### 🏠 Home & Dashboard

* **Home**: Redirects to ICUE.VN homepage.
* **Dashboard**: The main area where you can view summary stats, recent contract updates, and quick actions.

---

### ✅ Approvals

* **Approve Tab**: Displays contracts awaiting approval.
* **Actions Available**:

  * **Request Approval**: Editors/Admins can request approval for a contract with a custom message.
  * **Approve Contract**: Admins/Approvers can review and approve contracts.
  * **Comment on Contracts**: Add feedback or discussion notes to a contract.

---

### 🔄 Update Status

* **Trigger Status Cron**: Runs a background job to auto-update contract statuses based on set rules (e.g., deadlines or conditions).
* Accessible via the sidebar button "Update Status"

---

### 👤 Profile Menu

Click the **Profile** button in the sidebar to reveal:

* **Change Password**: Initiates the password reset flow.
* **Read Manual**: Opens this user manual.
* **Send Feedback**: Opens a form (or mailto) to share ideas or report bugs.

---

### 🔍 Sidebar Navigation

* **Collapsible Sidebar**: Toggle between collapsed and expanded states.
* **Mobile Mode**: On screens smaller than 1024px, the sidebar appears at the bottom in a row layout.

---

### ✨ Roles & Permissions

| Role     | Permissions                                                           |
| -------- | --------------------------------------------------------------------- |
| Admin    | Full access: create, edit, delete, approve, and comment on contracts. |
| Editor   | Can create, edit, and delete contracts, but not approve them.         |
| Approver | Can view and approve contracts but cannot edit.                       |
| Viewer   | Read-only access to all contract data.                                |

---

### 📄 Commenting & Collaboration

* Add inline comments on contract details.
* All comments are timestamped and visible to others with access.

---

### ⚠️ Known Limitations

* Approval request button is disabled if the contract is already pending.
* Comments and approvals are restricted via Supabase Row Level Security (RLS).

---

### 🚀 Tips & Shortcuts

* Use the sidebar in collapsed mode to save screen space.
* Use the status cron update to avoid manual tracking.
* Use the manual and feedback options to improve your experience.

---

Happy Contracting! 📍

---

For questions or help, contact the PeaceCord team or open the Help section in the app.

import { useState } from "react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";

const PlatformUsers = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const toast = useToast();

  const handleInvite = async () => {
    try {
      await api.post("/invitations", {
        name,
        email,
        role: "CORPORATE_ADMIN",
      });

      toast.success("Corporate Admin invited successfully.");
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to invite Corporate Admin.",
      );
    }
  };

  return (
    <div>
      <h2>Platform Users</h2>

      <div style={{ marginTop: 20 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button onClick={handleInvite}>
          Invite Corporate Admin
        </button>
      </div>
    </div>
  );
};

export default PlatformUsers;

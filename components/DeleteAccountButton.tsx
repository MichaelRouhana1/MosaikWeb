"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/actions/deleteAccount";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (confirm("Are you sure you want to permanently delete your account and personal data? This action cannot be undone.")) {
            startTransition(async () => {
                try {
                    await deleteAccount();
                    // The server action redirects on success
                } catch (error) {
                    toast.error("Failed to delete account. Please try again.");
                }
            });
        }
    };

    return (
        <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
        >
            {isPending ? "Deleting..." : "Delete My Account & Personal Data"}
        </Button>
    );
}

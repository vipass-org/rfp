"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Award,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { BidWithDetails, BidStatus } from "@/types/database";

export default function AdminBidDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [bid, setBid] = useState<BidWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [contractData, setContractData] = useState({
    contract_value: "",
    start_date: "",
    end_date: "",
    terms: "",
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchBid = async () => {
      const { data, error } = await supabase
        .from("bids")
        .select(`*, rfps (*, categories (*)), profiles (*), bid_documents (*)`)
        .eq("id", params.id)
        .single();

      if (error || !data) {
        router.push("/admin/bids");
        return;
      }

      setBid(data as BidWithDetails);
      setAdminNotes(data.admin_notes || "");
      setContractData((prev) => ({
        ...prev,
        contract_value: data.amount.toString(),
      }));
      setLoading(false);
    };

    fetchBid();
  }, [params.id, router, supabase]);

  const updateStatus = async (newStatus: BidStatus) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bids")
        .update({ status: newStatus, admin_notes: adminNotes || null })
        .eq("id", params.id);

      if (error) throw error;

      setBid((prev) => (prev ? { ...prev, status: newStatus, admin_notes: adminNotes } : null));

      toast({
        title: "Status updated",
        description: `Bid status changed to ${newStatus.replace("_", " ")}`,
      });
    } catch {
      toast({
        title: "Update failed",
        description: "Failed to update bid status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bids")
        .update({ admin_notes: adminNotes || null })
        .eq("id", params.id);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Admin notes have been updated",
      });
    } catch {
      toast({
        title: "Save failed",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const awardContract = async () => {
    if (!contractData.start_date || !contractData.end_date || !contractData.contract_value) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required contract fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Create contract
      const { error: contractError } = await supabase.from("contracts").insert({
        rfp_id: bid!.rfp_id,
        bid_id: bid!.id,
        vendor_id: bid!.vendor_id,
        contract_value: parseFloat(contractData.contract_value),
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        terms: contractData.terms || null,
      });

      if (contractError) throw contractError;

      // Update bid status
      await supabase.from("bids").update({ status: "approved" }).eq("id", params.id);

      // Update RFP status
      await supabase.from("rfps").update({ status: "awarded" }).eq("id", bid!.rfp_id);

      // Reject other bids for this RFP
      await supabase
        .from("bids")
        .update({ status: "rejected" })
        .eq("rfp_id", bid!.rfp_id)
        .neq("id", params.id)
        .in("status", ["pending", "under_review", "shortlisted"]);

      // Notify vendor
      await supabase.from("notifications").insert({
        user_id: bid!.vendor_id,
        title: "Contract Awarded",
        message: `Congratulations! Your bid for "${bid!.rfps.title}" has been approved and you have been awarded the contract.`,
        type: "contract_award",
        link: "/bids",
      });

      toast({
        title: "Contract awarded",
        description: "The contract has been awarded successfully",
      });

      setShowAwardDialog(false);
      router.push("/admin/contracts");
    } catch (error) {
      console.error("Award error:", error);
      toast({
        title: "Award failed",
        description: "Failed to award contract",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from("bid-documents")
      .download(filePath);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!bid) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">
                {bid.rfps.reference_number}
              </span>
              <Badge className={getStatusColor(bid.status)}>
                {bid.status.replace("_", " ")}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">Bid Review</h1>
          </div>
        </div>
        {bid.status !== "approved" && bid.status !== "rejected" && (
          <Dialog open={showAwardDialog} onOpenChange={setShowAwardDialog}>
            <DialogTrigger asChild>
              <Button>
                <Award className="mr-2 h-4 w-4" />
                Award Contract
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Award Contract</DialogTitle>
                <DialogDescription>
                  Create a contract for this bid. This will approve this bid and
                  reject all other pending bids.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Contract Value (GHS) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={contractData.contract_value}
                    onChange={(e) =>
                      setContractData({
                        ...contractData,
                        contract_value: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={contractData.start_date}
                      onChange={(e) =>
                        setContractData({
                          ...contractData,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={contractData.end_date}
                      onChange={(e) =>
                        setContractData({
                          ...contractData,
                          end_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={contractData.terms}
                    onChange={(e) =>
                      setContractData({ ...contractData, terms: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAwardDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={awardContract} disabled={saving}>
                  {saving ? "Awarding..." : "Award Contract"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* RFP Info */}
          <Card>
            <CardHeader>
              <CardTitle>RFP Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/admin/rfps/${bid.rfp_id}`}
                className="text-lg font-medium text-primary hover:underline"
              >
                {bid.rfps.title}
              </Link>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>{bid.rfps.categories.name}</span>
                {bid.rfps.estimated_value && (
                  <span>Est: {formatCurrency(bid.rfps.estimated_value)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Proposal */}
          <Card>
            <CardHeader>
              <CardTitle>Proposal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{bid.proposal}</p>
            </CardContent>
          </Card>

          {/* Documents */}
          {bid.bid_documents && bid.bid_documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submitted Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bid.bid_documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(doc.file_path, doc.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
              <CardDescription>Internal notes (not visible to vendor)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add notes about this bid..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
              <Button onClick={saveNotes} disabled={saving}>
                {saving ? "Saving..." : "Save Notes"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-semibold">
                    {bid.profiles.company_name || "N/A"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{bid.profiles.email}</p>
                </div>
              </div>

              {bid.profiles.company_phone && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{bid.profiles.company_phone}</p>
                    </div>
                  </div>
                </>
              )}

              {bid.profiles.contact_person && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="font-semibold">{bid.profiles.contact_person}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Bid Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bid Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bid Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(bid.amount)}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-semibold">{formatDateTime(bid.submitted_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={bid.status}
                onValueChange={(value) => updateStatus(value as BidStatus)}
                disabled={saving || bid.status === "approved"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                To approve a bid, use the &quot;Award Contract&quot; button above
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

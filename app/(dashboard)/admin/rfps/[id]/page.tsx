"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Download,
  FileText,
  Calendar,
  DollarSign,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { RFPWithDetails, BidWithDetails, RFPStatus } from "@/types/database";

export default function AdminRFPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [rfp, setRfp] = useState<RFPWithDetails | null>(null);
  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch RFP
      const { data: rfpData, error } = await supabase
        .from("rfps")
        .select(`*, categories (*), rfp_documents (*)`)
        .eq("id", params.id)
        .single();

      if (error || !rfpData) {
        router.push("/admin/rfps");
        return;
      }

      setRfp(rfpData as RFPWithDetails);

      // Fetch bids for this RFP
      const { data: bidsData } = await supabase
        .from("bids")
        .select(`*, profiles (*), bid_documents (*)`)
        .eq("rfp_id", params.id)
        .order("submitted_at", { ascending: false });

      if (bidsData) {
        setBids(bidsData as unknown as BidWithDetails[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [params.id, router, supabase]);

  const updateStatus = async (newStatus: RFPStatus) => {
    try {
      const updateData: Record<string, string | null> = { status: newStatus };
      if (newStatus === "published" && rfp?.status !== "published") {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("rfps")
        .update(updateData)
        .eq("id", params.id);

      if (error) throw error;

      setRfp((prev) =>
        prev ? { ...prev, status: newStatus, published_at: updateData.published_at || prev.published_at } : null
      );

      toast({
        title: "Status updated",
        description: `RFP status changed to ${newStatus}`,
      });
    } catch {
      toast({
        title: "Update failed",
        description: "Failed to update RFP status",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from("rfp-documents")
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

  if (!rfp) return null;

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
                {rfp.reference_number}
              </span>
              <Badge variant="info">{rfp.categories.name}</Badge>
            </div>
            <h1 className="text-2xl font-bold">{rfp.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rfp.status} onValueChange={(value) => updateStatus(value as RFPStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Link href={`/admin/rfps/${rfp.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rfp.description}</p>
            </CardContent>
          </Card>

          {rfp.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{rfp.requirements}</p>
              </CardContent>
            </Card>
          )}

          {rfp.evaluation_criteria && (
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{rfp.evaluation_criteria}</p>
              </CardContent>
            </Card>
          )}

          {rfp.rfp_documents && rfp.rfp_documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rfp.rfp_documents.map((doc) => (
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

          {/* Bids Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Submitted Bids</CardTitle>
                  <CardDescription>{bids.length} bids received</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bids.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No bids submitted yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid) => (
                      <TableRow key={bid.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {bid.profiles.company_name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bid.profiles.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(bid.amount)}
                        </TableCell>
                        <TableCell>{formatDate(bid.submitted_at)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(bid.status)}>
                            {bid.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/bids/${bid.id}`}>
                            <Button variant="ghost" size="sm">
                              Review
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(rfp.status)}>{rfp.status}</Badge>
              </div>

              <Separator />

              {rfp.estimated_value && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. Value</p>
                      <p className="font-semibold">{formatCurrency(rfp.estimated_value)}</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Calendar className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-semibold">{formatDateTime(rfp.submission_deadline)}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bids Received</p>
                  <p className="font-semibold">{bids.length}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{formatDate(rfp.created_at)}</p>
              </div>

              {rfp.published_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p>{formatDate(rfp.published_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

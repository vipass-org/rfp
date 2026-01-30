"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Building,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { RFPWithDetails, Bid } from "@/types/database";

export default function RFPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rfp, setRfp] = useState<RFPWithDetails | null>(null);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchRfp = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch RFP details
      const { data: rfpData, error } = await supabase
        .from("rfps")
        .select(`*, categories (*), rfp_documents (*)`)
        .eq("id", params.id)
        .single();

      if (error || !rfpData) {
        router.push("/rfps");
        return;
      }

      setRfp(rfpData as RFPWithDetails);

      // Check if user already submitted a bid
      if (user) {
        const { data: bidData } = await supabase
          .from("bids")
          .select("*")
          .eq("rfp_id", params.id)
          .eq("vendor_id", user.id)
          .single();

        if (bidData) {
          setExistingBid(bidData);
        }
      }

      setLoading(false);
    };

    fetchRfp();
  }, [params.id, router, supabase]);

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

  if (!rfp) {
    return null;
  }

  const isExpired = new Date(rfp.submission_deadline) < new Date();
  const canBid = !isExpired && rfp.status === "published" && !existingBid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">
              {rfp.reference_number}
            </span>
            <Badge variant="info">{rfp.categories.name}</Badge>
            <Badge className={getStatusColor(rfp.status)}>{rfp.status}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{rfp.title}</h1>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rfp.estimated_value && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                    <p className="font-semibold">{formatCurrency(rfp.estimated_value)}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isExpired ? "bg-gray-100" : "bg-destructive/10"}`}>
                  <Calendar className={`h-5 w-5 ${isExpired ? "text-gray-500" : "text-destructive"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submission Deadline</p>
                  <p className={`font-semibold ${isExpired ? "text-muted-foreground" : "text-destructive"}`}>
                    {formatDateTime(rfp.submission_deadline)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="font-semibold">
                    {rfp.published_at ? formatDate(rfp.published_at) : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bid Status Card */}
          {existingBid ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Bid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={getStatusColor(existingBid.status)}>
                    {existingBid.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    {formatCurrency(existingBid.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{formatDate(existingBid.submitted_at)}</span>
                </div>
                <Link href="/bids">
                  <Button variant="outline" className="w-full">
                    View My Bids
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Submit Your Bid</CardTitle>
              </CardHeader>
              <CardContent>
                {isExpired ? (
                  <p className="text-muted-foreground text-sm">
                    The submission deadline for this RFP has passed.
                  </p>
                ) : rfp.status !== "published" ? (
                  <p className="text-muted-foreground text-sm">
                    This RFP is not accepting bids at this time.
                  </p>
                ) : (
                  <>
                    <p className="text-muted-foreground text-sm mb-4">
                      Submit your proposal and compete for this opportunity.
                    </p>
                    <Link href={`/rfps/${rfp.id}/bid`}>
                      <Button className="w-full">Submit Bid</Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { RFP } from "@/types/database";

interface UploadedFile {
  file: File;
  name: string;
}

export default function SubmitBidPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [rfp, setRfp] = useState<RFP | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchRfp = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch RFP
      const { data: rfpData, error } = await supabase
        .from("rfps")
        .select("*")
        .eq("id", params.id)
        .eq("status", "published")
        .single();

      if (error || !rfpData) {
        toast({
          title: "RFP not found",
          description: "This RFP is not available for bidding",
          variant: "destructive",
        });
        router.push("/rfps");
        return;
      }

      // Check if deadline has passed
      if (new Date(rfpData.submission_deadline) < new Date()) {
        toast({
          title: "Deadline passed",
          description: "The submission deadline for this RFP has passed",
          variant: "destructive",
        });
        router.push(`/rfps/${params.id}`);
        return;
      }

      // Check if already submitted a bid
      const { data: existingBid } = await supabase
        .from("bids")
        .select("id")
        .eq("rfp_id", params.id)
        .eq("vendor_id", user.id)
        .single();

      if (existingBid) {
        toast({
          title: "Already submitted",
          description: "You have already submitted a bid for this RFP",
        });
        router.push(`/rfps/${params.id}`);
        return;
      }

      setRfp(rfpData);
      setLoading(false);
    };

    fetchRfp();
  }, [params.id, router, supabase, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 10MB limit`,
          variant: "destructive",
        });
        continue;
      }
      newFiles.push({ file, name: file.name });
    }

    setFiles([...files, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      });
      return;
    }

    if (!proposal.trim()) {
      toast({
        title: "Proposal required",
        description: "Please provide your proposal details",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Create the bid
      const { data: bid, error: bidError } = await supabase
        .from("bids")
        .insert({
          rfp_id: params.id as string,
          vendor_id: user.id,
          amount: parseFloat(amount),
          proposal: proposal.trim(),
        })
        .select()
        .single();

      if (bidError) {
        throw bidError;
      }

      // Upload documents
      for (const uploadedFile of files) {
        const filePath = `${user.id}/${bid.id}/${Date.now()}-${uploadedFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("bid-documents")
          .upload(filePath, uploadedFile.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Create document record
        await supabase.from("bid_documents").insert({
          bid_id: bid.id,
          name: uploadedFile.name,
          file_path: filePath,
          file_size: uploadedFile.file.size,
          file_type: uploadedFile.file.type,
        });
      }

      toast({
        title: "Bid submitted",
        description: "Your bid has been submitted successfully",
      });

      router.push("/bids");
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Submission failed",
        description: "Failed to submit your bid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Submit Bid</h1>
          <p className="text-muted-foreground">{rfp.reference_number}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rfp.title}</CardTitle>
          <CardDescription>
            {rfp.estimated_value && (
              <span>Estimated Value: {formatCurrency(rfp.estimated_value)}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Bid Amount (GHS) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter your bid amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposal">Proposal *</Label>
              <Textarea
                id="proposal"
                placeholder="Describe your approach, methodology, timeline, and why you're the best fit for this project..."
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Supporting Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="files"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="files"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, XLS, PPT, Images (max 10MB each)
                  </p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Bid"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

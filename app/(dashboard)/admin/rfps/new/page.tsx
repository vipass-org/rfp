"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@/types/database";

interface UploadedFile {
  file: File;
  name: string;
}

export default function CreateRFPPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    estimated_value: "",
    submission_deadline: "",
    requirements: "",
    evaluation_criteria: "",
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [publishNow, setPublishNow] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      if (data) setCategories(data);
    };
    fetchCategories();
  }, [supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

    if (!formData.title || !formData.description || !formData.category_id || !formData.submission_deadline) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Create RFP
      const { data: rfp, error: rfpError } = await supabase
        .from("rfps")
        .insert({
          title: formData.title,
          description: formData.description,
          category_id: formData.category_id,
          estimated_value: formData.estimated_value
            ? parseFloat(formData.estimated_value)
            : null,
          submission_deadline: new Date(formData.submission_deadline).toISOString(),
          requirements: formData.requirements || null,
          evaluation_criteria: formData.evaluation_criteria || null,
          status: publishNow ? "published" : "draft",
          published_at: publishNow ? new Date().toISOString() : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (rfpError) throw rfpError;

      // Upload documents
      for (const uploadedFile of files) {
        const filePath = `${rfp.id}/${Date.now()}-${uploadedFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("rfp-documents")
          .upload(filePath, uploadedFile.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Create document record
        await supabase.from("rfp_documents").insert({
          rfp_id: rfp.id,
          name: uploadedFile.name,
          file_path: filePath,
          file_size: uploadedFile.file.size,
          file_type: uploadedFile.file.type,
          uploaded_by: user.id,
        });
      }

      toast({
        title: "RFP created",
        description: publishNow
          ? "RFP has been published successfully"
          : "RFP saved as draft",
      });

      router.push("/admin/rfps");
    } catch (error) {
      console.error("Create error:", error);
      toast({
        title: "Creation failed",
        description: "Failed to create RFP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New RFP</h1>
          <p className="text-muted-foreground">
            Fill in the details to create a new Request for Proposal
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core details about the RFP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter RFP title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed description of the project/service required"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value (GHS)</Label>
                <Input
                  id="estimated_value"
                  name="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter estimated budget"
                  value={formData.estimated_value}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission_deadline">Submission Deadline *</Label>
              <Input
                id="submission_deadline"
                name="submission_deadline"
                type="datetime-local"
                value={formData.submission_deadline}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Requirements & Criteria</CardTitle>
            <CardDescription>
              Specify requirements and how bids will be evaluated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                name="requirements"
                placeholder="List all requirements for vendors (qualifications, certifications, experience, etc.)"
                value={formData.requirements}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evaluation_criteria">Evaluation Criteria</Label>
              <Textarea
                id="evaluation_criteria"
                name="evaluation_criteria"
                placeholder="Describe how bids will be evaluated (scoring methodology, weightings, etc.)"
                value={formData.evaluation_criteria}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Attach relevant documents for vendors to review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="space-y-2">
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
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            className="flex-1"
            disabled={loading}
            onClick={() => setPublishNow(false)}
          >
            {loading ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading}
            onClick={() => setPublishNow(true)}
          >
            {loading ? "Publishing..." : "Publish Now"}
          </Button>
        </div>
      </form>
    </div>
  );
}

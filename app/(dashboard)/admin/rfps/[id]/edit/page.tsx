"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, FileText, Trash } from "lucide-react";
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
import { Category, RFPWithDetails, RFPDocument } from "@/types/database";

interface UploadedFile {
  file: File;
  name: string;
}

export default function EditRFPPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingDocs, setExistingDocs] = useState<RFPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    estimated_value: "",
    submission_deadline: "",
    requirements: "",
    evaluation_criteria: "",
  });
  const [newFiles, setNewFiles] = useState<UploadedFile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (categoriesData) setCategories(categoriesData);

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

      const rfp = rfpData as RFPWithDetails;
      setFormData({
        title: rfp.title,
        description: rfp.description,
        category_id: rfp.category_id,
        estimated_value: rfp.estimated_value?.toString() || "",
        submission_deadline: new Date(rfp.submission_deadline)
          .toISOString()
          .slice(0, 16),
        requirements: rfp.requirements || "",
        evaluation_criteria: rfp.evaluation_criteria || "",
      });
      setExistingDocs(rfp.rfp_documents || []);
      setLoading(false);
    };

    fetchData();
  }, [params.id, router, supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const files: UploadedFile[] = [];
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
      files.push({ file, name: file.name });
    }

    setNewFiles([...newFiles, ...files]);
    e.target.value = "";
  };

  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const deleteExistingDoc = async (doc: RFPDocument) => {
    try {
      // Delete from storage
      await supabase.storage.from("rfp-documents").remove([doc.file_path]);

      // Delete record
      await supabase.from("rfp_documents").delete().eq("id", doc.id);

      setExistingDocs(existingDocs.filter((d) => d.id !== doc.id));

      toast({
        title: "Document deleted",
        description: "The document has been removed",
      });
    } catch {
      toast({
        title: "Delete failed",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
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

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Update RFP
      const { error: updateError } = await supabase
        .from("rfps")
        .update({
          title: formData.title,
          description: formData.description,
          category_id: formData.category_id,
          estimated_value: formData.estimated_value
            ? parseFloat(formData.estimated_value)
            : null,
          submission_deadline: new Date(formData.submission_deadline).toISOString(),
          requirements: formData.requirements || null,
          evaluation_criteria: formData.evaluation_criteria || null,
        })
        .eq("id", params.id);

      if (updateError) throw updateError;

      // Upload new documents
      for (const uploadedFile of newFiles) {
        const filePath = `${params.id}/${Date.now()}-${uploadedFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("rfp-documents")
          .upload(filePath, uploadedFile.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        await supabase.from("rfp_documents").insert({
          rfp_id: params.id as string,
          name: uploadedFile.name,
          file_path: filePath,
          file_size: uploadedFile.file.size,
          file_type: uploadedFile.file.type,
          uploaded_by: user.id,
        });
      }

      toast({
        title: "RFP updated",
        description: "Changes have been saved successfully",
      });

      router.push(`/admin/rfps/${params.id}`);
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update RFP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit RFP</h1>
          <p className="text-muted-foreground">Update RFP details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
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
                    <SelectValue />
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                name="requirements"
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
            <CardDescription>Manage attached documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Documents */}
            {existingDocs.length > 0 && (
              <div className="space-y-2">
                <Label>Existing Documents</Label>
                {existingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteExistingDoc(doc)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload New */}
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
                <p className="text-sm text-muted-foreground">Add more documents</p>
              </label>
            </div>

            {/* New Files */}
            {newFiles.length > 0 && (
              <div className="space-y-2">
                <Label>New Documents</Label>
                {newFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-green-50"
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
                      onClick={() => removeNewFile(index)}
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
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

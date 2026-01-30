"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, Calendar, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RFPWithCategory, Category } from "@/types/database";

export default function RFPsPage() {
  const [rfps, setRfps] = useState<RFPWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (data) setCategories(data);
    };

    fetchCategories();
  }, [supabase]);

  useEffect(() => {
    const fetchRfps = async () => {
      setLoading(true);
      let query = supabase
        .from("rfps")
        .select(`*, categories (*)`)
        .in("status", ["published", "closed"])
        .order("published_at", { ascending: false });

      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,reference_number.ilike.%${search}%`);
      }

      const { data } = await query;
      if (data) setRfps(data as RFPWithCategory[]);
      setLoading(false);
    };

    fetchRfps();
  }, [supabase, search, categoryFilter]);

  const isExpired = (deadline: string) => new Date(deadline) < new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse RFPs</h1>
        <p className="text-muted-foreground">
          Find and bid on available opportunities
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RFPs by title, description, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RFPs Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : rfps.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No RFPs found matching your criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rfps.map((rfp) => {
            const expired = isExpired(rfp.submission_deadline);
            return (
              <Card
                key={rfp.id}
                className={`hover:shadow-lg transition-shadow ${
                  expired ? "opacity-75" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="info">{rfp.categories.name}</Badge>
                    <Badge variant={expired ? "secondary" : "success"}>
                      {expired ? "Closed" : "Open"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {rfp.reference_number}
                  </span>
                  <CardTitle className="text-lg line-clamp-2">{rfp.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {rfp.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 text-sm">
                    {rfp.estimated_value && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Est. Value: {formatCurrency(rfp.estimated_value)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={expired ? "text-muted-foreground" : "text-destructive"}>
                        Deadline: {formatDate(rfp.submission_deadline)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/rfps/${rfp.id}`}>
                    <Button className="w-full" variant={expired ? "secondary" : "default"}>
                      {expired ? "View Details" : "View & Bid"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

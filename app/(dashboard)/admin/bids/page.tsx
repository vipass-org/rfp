"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Eye, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { BidWithDetails } from "@/types/database";

export default function AdminBidsPage() {
  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    const fetchBids = async () => {
      setLoading(true);
      let query = supabase
        .from("bids")
        .select(`*, rfps (*, categories (*)), profiles (*), bid_documents (*)`)
        .order("submitted_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;

      if (data) {
        let filteredData = data as BidWithDetails[];
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = filteredData.filter(
            (bid) =>
              bid.rfps.title.toLowerCase().includes(searchLower) ||
              bid.rfps.reference_number.toLowerCase().includes(searchLower) ||
              bid.profiles.company_name?.toLowerCase().includes(searchLower) ||
              bid.profiles.email.toLowerCase().includes(searchLower)
          );
        }
        setBids(filteredData);
      }
      setLoading(false);
    };

    fetchBids();
  }, [supabase, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Bids</h1>
        <p className="text-muted-foreground">Review and manage vendor bid submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by RFP or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : bids.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No bids found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFP</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bid Amount</TableHead>
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
                        <p className="font-medium line-clamp-1">{bid.rfps.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {bid.rfps.reference_number}
                        </p>
                      </div>
                    </TableCell>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/bids/${bid.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Review
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, MoreHorizontal, Eye, FileCheck } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { ContractWithDetails, ContractStatus } from "@/types/database";

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      let query = supabase
        .from("contracts")
        .select(`*, rfps (*), bids (*), profiles (*)`)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;

      if (data) {
        let filteredData = data as ContractWithDetails[];
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = filteredData.filter(
            (contract) =>
              contract.rfps.title.toLowerCase().includes(searchLower) ||
              contract.rfps.reference_number.toLowerCase().includes(searchLower) ||
              contract.profiles.company_name?.toLowerCase().includes(searchLower) ||
              contract.profiles.email.toLowerCase().includes(searchLower)
          );
        }
        setContracts(filteredData);
      }
      setLoading(false);
    };

    fetchContracts();
  }, [supabase, search, statusFilter]);

  const updateStatus = async (id: string, newStatus: ContractStatus) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setContracts(
        contracts.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );

      toast({
        title: "Status updated",
        description: `Contract status changed to ${newStatus}`,
      });
    } catch {
      toast({
        title: "Update failed",
        description: "Failed to update contract status",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "active").length,
    completed: contracts.filter((c) => c.status === "completed").length,
    totalValue: contracts.reduce((sum, c) => sum + c.contract_value, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contract Management</h1>
        <p className="text-muted-foreground">
          View and manage awarded contracts
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
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
          ) : contracts.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contracts found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFP</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contract Value</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/admin/rfps/${contract.rfp_id}`}
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {contract.rfps.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {contract.rfps.reference_number}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {contract.profiles.company_name || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contract.profiles.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(contract.contract_value)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(contract.start_date)}</p>
                        <p className="text-muted-foreground">
                          to {formatDate(contract.end_date)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contract.status)}>
                        {contract.status}
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
                            <Link href={`/admin/rfps/${contract.rfp_id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View RFP
                            </Link>
                          </DropdownMenuItem>
                          {contract.status === "active" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatus(contract.id, "completed")
                                }
                              >
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  updateStatus(contract.id, "terminated")
                                }
                              >
                                Terminate
                              </DropdownMenuItem>
                            </>
                          )}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Gavel,
  Users,
  FileCheck,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { RFPWithCategory, BidWithDetails } from "@/types/database";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRfps: 0,
    publishedRfps: 0,
    totalBids: 0,
    pendingBids: 0,
    totalVendors: 0,
    activeContracts: 0,
  });
  const [recentRfps, setRecentRfps] = useState<RFPWithCategory[]>([]);
  const [recentBids, setRecentBids] = useState<BidWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch stats
      const [
        { count: totalRfps },
        { count: publishedRfps },
        { count: totalBids },
        { count: pendingBids },
        { count: totalVendors },
        { count: activeContracts },
      ] = await Promise.all([
        supabase.from("rfps").select("*", { count: "exact", head: true }),
        supabase.from("rfps").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("bids").select("*", { count: "exact", head: true }),
        supabase.from("bids").select("*", { count: "exact", head: true }).in("status", ["pending", "under_review"]),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "vendor"),
        supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      setStats({
        totalRfps: totalRfps || 0,
        publishedRfps: publishedRfps || 0,
        totalBids: totalBids || 0,
        pendingBids: pendingBids || 0,
        totalVendors: totalVendors || 0,
        activeContracts: activeContracts || 0,
      });

      // Fetch recent RFPs
      const { data: rfpsData } = await supabase
        .from("rfps")
        .select(`*, categories (*)`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (rfpsData) {
        setRecentRfps(rfpsData as RFPWithCategory[]);
      }

      // Fetch recent bids
      const { data: bidsData } = await supabase
        .from("bids")
        .select(`*, rfps (*, categories (*)), profiles (*)`)
        .order("submitted_at", { ascending: false })
        .limit(5);

      if (bidsData) {
        setRecentBids(bidsData as BidWithDetails[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of RFP portal activity</p>
        </div>
        <Link href="/admin/rfps/new">
          <Button>Create RFP</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total RFPs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRfps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.publishedRfps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBids}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingBids}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contracts</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeContracts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent RFPs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent RFPs</CardTitle>
                <CardDescription>Latest RFPs in the system</CardDescription>
              </div>
              <Link href="/admin/rfps">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRfps.map((rfp) => (
                <Link
                  key={rfp.id}
                  href={`/admin/rfps/${rfp.id}`}
                  className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground">
                      {rfp.reference_number}
                    </span>
                    <Badge className={getStatusColor(rfp.status)}>{rfp.status}</Badge>
                  </div>
                  <h4 className="font-medium line-clamp-1">{rfp.title}</h4>
                  <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                    <span>{rfp.categories.name}</span>
                    <span>{formatDate(rfp.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Bids */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Bids</CardTitle>
                <CardDescription>Latest bid submissions</CardDescription>
              </div>
              <Link href="/admin/bids">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBids.map((bid) => (
                <Link
                  key={bid.id}
                  href={`/admin/bids/${bid.id}`}
                  className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground">
                      {bid.rfps.reference_number}
                    </span>
                    <Badge className={getStatusColor(bid.status)}>
                      {bid.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <h4 className="font-medium line-clamp-1">{bid.rfps.title}</h4>
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <span className="text-muted-foreground">
                      {bid.profiles.company_name || bid.profiles.email}
                    </span>
                    <span className="font-medium">{formatCurrency(bid.amount)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

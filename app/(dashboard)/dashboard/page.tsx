"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Gavel, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { RFPWithCategory, BidWithDetails, Profile } from "@/types/database";

export default function VendorDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentRfps, setRecentRfps] = useState<RFPWithCategory[]>([]);
  const [myBids, setMyBids] = useState<BidWithDetails[]>([]);
  const [stats, setStats] = useState({
    totalBids: 0,
    pendingBids: 0,
    approvedBids: 0,
    activeRfps: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // If admin, redirect to admin dashboard
        if (profileData.role === "admin") {
          window.location.href = "/admin";
          return;
        }
      }

      // Fetch recent published RFPs
      const { data: rfpsData } = await supabase
        .from("rfps")
        .select(`*, categories (*)`)
        .eq("status", "published")
        .gte("submission_deadline", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(5);

      if (rfpsData) {
        setRecentRfps(rfpsData as RFPWithCategory[]);
      }

      // Fetch my bids
      const { data: bidsData } = await supabase
        .from("bids")
        .select(`*, rfps (*, categories (*)), profiles (*)`)
        .eq("vendor_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(5);

      if (bidsData) {
        setMyBids(bidsData as BidWithDetails[]);
      }

      // Fetch stats
      const { count: totalBids } = await supabase
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", user.id);

      const { count: pendingBids } = await supabase
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .in("status", ["pending", "under_review", "shortlisted"]);

      const { count: approvedBids } = await supabase
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .eq("status", "approved");

      const { count: activeRfps } = await supabase
        .from("rfps")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .gte("submission_deadline", new Date().toISOString());

      setStats({
        totalBids: totalBids || 0,
        pendingBids: pendingBids || 0,
        approvedBids: approvedBids || 0,
        activeRfps: activeRfps || 0,
      });

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
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.contact_person || profile?.company_name || "Vendor"}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your bidding activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active RFPs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRfps}</div>
            <p className="text-xs text-muted-foreground">Available for bidding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBids}</div>
            <p className="text-xs text-muted-foreground">Submitted by you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBids}</div>
            <p className="text-xs text-muted-foreground">Awaiting decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved Bids</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedBids}</div>
            <p className="text-xs text-muted-foreground">Contracts won</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent RFPs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Latest Opportunities</CardTitle>
                <CardDescription>New RFPs available for bidding</CardDescription>
              </div>
              <Link href="/rfps">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentRfps.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                No active RFPs at the moment
              </p>
            ) : (
              <div className="space-y-4">
                {recentRfps.map((rfp) => (
                  <Link
                    key={rfp.id}
                    href={`/rfps/${rfp.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted-foreground">
                        {rfp.reference_number}
                      </span>
                      <Badge variant="info">{rfp.categories.name}</Badge>
                    </div>
                    <h4 className="font-medium line-clamp-1">{rfp.title}</h4>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      {rfp.estimated_value && (
                        <span className="text-muted-foreground">
                          {formatCurrency(rfp.estimated_value)}
                        </span>
                      )}
                      <span className="text-destructive">
                        Due: {formatDate(rfp.submission_deadline)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Recent Bids */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Recent Bids</CardTitle>
                <CardDescription>Track your bid submissions</CardDescription>
              </div>
              <Link href="/bids">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {myBids.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t submitted any bids yet
                </p>
                <Link href="/rfps">
                  <Button>Browse RFPs</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myBids.map((bid) => (
                  <div
                    key={bid.id}
                    className="p-4 rounded-lg border"
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
                      <span className="font-medium">
                        {formatCurrency(bid.amount)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(bid.submitted_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

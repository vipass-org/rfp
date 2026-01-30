"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Calendar, DollarSign, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { BidWithDetails } from "@/types/database";

export default function MyBidsPage() {
  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchBids = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("bids")
        .select(`
          *,
          rfps (*, categories (*)),
          profiles (*),
          bid_documents (*)
        `)
        .eq("vendor_id", user.id)
        .order("submitted_at", { ascending: false });

      if (data) {
        setBids(data as BidWithDetails[]);
      }
      setLoading(false);
    };

    fetchBids();
  }, [supabase]);

  const pendingBids = bids.filter((b) =>
    ["pending", "under_review", "shortlisted"].includes(b.status)
  );
  const completedBids = bids.filter((b) =>
    ["approved", "rejected", "withdrawn"].includes(b.status)
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const BidsTable = ({ bids }: { bids: BidWithDetails[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RFP</TableHead>
          <TableHead>Category</TableHead>
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
                <p className="font-medium">{bid.rfps.title}</p>
                <p className="text-xs text-muted-foreground">
                  {bid.rfps.reference_number}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="info">{bid.rfps.categories.name}</Badge>
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
              <Link href={`/rfps/${bid.rfp_id}`}>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bids</h1>
        <p className="text-muted-foreground">
          Track and manage your bid submissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bids.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {bids.filter((b) => b.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {bids.filter((b) => b.status === "under_review").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {bids.filter((b) => b.status === "approved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {bids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No bids yet</h3>
            <p className="text-muted-foreground mb-4">
              Start exploring available RFPs and submit your first bid
            </p>
            <Link href="/rfps">
              <Button>Browse RFPs</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Active ({pendingBids.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedBids.length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({bids.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Active Bids</CardTitle>
                <CardDescription>
                  Bids that are pending review or being evaluated
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingBids.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No active bids
                  </p>
                ) : (
                  <BidsTable bids={pendingBids} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Completed Bids</CardTitle>
                <CardDescription>
                  Bids that have been approved, rejected, or withdrawn
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedBids.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No completed bids
                  </p>
                ) : (
                  <BidsTable bids={completedBids} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Bids</CardTitle>
                <CardDescription>Complete history of all your bids</CardDescription>
              </CardHeader>
              <CardContent>
                <BidsTable bids={bids} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

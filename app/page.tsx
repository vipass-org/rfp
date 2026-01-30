import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileText, Shield, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch recent published RFPs
  const { data: recentRfps } = await supabase
    .from("rfps")
    .select(`
      *,
      categories (name)
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/gpha-logo.png"
              alt="GPHA Logo"
              width={48}
              height={48}
              className="object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-primary">Ghana Ports and Harbour Authority</h1>
              <p className="text-xs text-muted-foreground">RFP Portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Register as Vendor</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Your Gateway to GPHA{" "}
            <span className="text-primary">Business Opportunities</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Browse and bid on Request for Proposals from Ghana Ports and Harbour
            Authority. Join our network of trusted vendors and grow your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View RFPs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Why Choose Our Portal?</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Easy Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse all available RFPs in one place with detailed requirements
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Secure Bidding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Submit your proposals through our secure, encrypted platform
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Real-time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get instant notifications on bid status and new opportunities
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Transparent Process</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fair and transparent evaluation of all submitted proposals
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent RFPs Section */}
      <section className="container mx-auto px-4 py-16 bg-gray-50">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Current Opportunities</h2>
          <Link href="/login">
            <Button variant="outline">
              View All RFPs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {recentRfps && recentRfps.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {recentRfps.map((rfp) => (
              <Card key={rfp.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="info">{rfp.categories?.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {rfp.reference_number}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-2">
                    {rfp.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {rfp.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {rfp.estimated_value && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Value:</span>
                        <span className="font-medium">
                          {formatCurrency(rfp.estimated_value)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="font-medium text-destructive">
                        {formatDate(rfp.submission_deadline)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                No active RFPs at the moment. Check back soon!
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Start Bidding?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join hundreds of vendors who have successfully partnered with GPHA.
              Register today and get access to exclusive business opportunities.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Register Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-900 text-gray-300">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/gpha-logo.png"
                alt="GPHA Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <p className="font-semibold text-white">Ghana Ports and Harbour Authority</p>
                <p className="text-xs">RFP Portal</p>
              </div>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} GPHA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  MapPin,
  User,
  ExternalLink,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface PendingVerification {
  id: string;
  title: string;
  address: string;
  owner_id: string;
  verification_status: string;
  verification_documents: string[];
  verification_notes: string | null;
  created_at: string;
  owner_name?: string;
  owner_email?: string;
}

interface DisputeWithPhoto {
  id: string;
  booking_id: string;
  dispute_type: string;
  description: string;
  status: string;
  created_at: string;
  checkout_photo_url?: string;
  spot_title?: string;
}

export const AdminVerificationReview = () => {
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [disputesWithPhotos, setDisputesWithPhotos] = useState<DisputeWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<PendingVerification | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithPhoto | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingVerifications();
    fetchDisputesWithPhotos();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_spots')
        .select('id, title, address, owner_id, verification_status, verification_documents, verification_notes, created_at')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch owner details for each verification
      const verificationsWithOwners = await Promise.all(
        (data || []).map(async (v) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', v.owner_id)
            .single();

          return {
            ...v,
            owner_name: profile?.full_name || 'Unknown',
            owner_email: profile?.email || 'Unknown'
          };
        })
      );

      setPendingVerifications(verificationsWithOwners);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      toast.error('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputesWithPhotos = async () => {
    try {
      // Get disputes with their associated booking checkout photos
      const { data: disputes, error } = await supabase
        .from('disputes')
        .select(`
          id,
          booking_id,
          dispute_type,
          description,
          status,
          created_at
        `)
        .in('status', ['pending', 'under_review'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch checkout photos for each dispute's booking
      const disputesWithPhotos = await Promise.all(
        (disputes || []).map(async (d) => {
          const { data: booking } = await supabase
            .from('bookings')
            .select('checkout_photo_url, parking_spots(title)')
            .eq('id', d.booking_id)
            .single();

          return {
            ...d,
            checkout_photo_url: booking?.checkout_photo_url || null,
            spot_title: (booking?.parking_spots as any)?.title || 'Unknown Spot'
          };
        })
      );

      setDisputesWithPhotos(disputesWithPhotos.filter(d => d.checkout_photo_url));
    } catch (error) {
      console.error('Error fetching disputes with photos:', error);
    }
  };

  const handleApproveVerification = async (spotId: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('parking_spots')
        .update({
          verification_status: 'verified',
          verification_notes: reviewNotes || 'Approved by admin',
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', spotId);

      if (error) throw error;

      toast.success('Verification approved successfully');
      setSelectedVerification(null);
      setReviewNotes('');
      fetchPendingVerifications();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('Failed to approve verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectVerification = async (spotId: string) => {
    if (!reviewNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('parking_spots')
        .update({
          verification_status: 'rejected',
          verification_notes: reviewNotes,
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', spotId);

      if (error) throw error;

      toast.success('Verification rejected');
      setSelectedVerification(null);
      setReviewNotes('');
      fetchPendingVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Failed to reject verification');
    } finally {
      setProcessing(false);
    }
  };

  const getDocumentUrl = async (path: string): Promise<string | null> => {
    try {
      const { data } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(path, 3600); // 1 hour expiry
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  const getCheckoutPhotoUrl = async (path: string): Promise<string | null> => {
    try {
      const { data } = await supabase.storage
        .from('parking-images')
        .createSignedUrl(path, 3600); // 1 hour expiry
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting photo URL:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading verifications...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Ownership Verifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Pending Ownership Verifications
          </CardTitle>
          <CardDescription>
            Review and approve/reject spot ownership verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingVerifications.length === 0 ? (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                No pending verifications at this time.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingVerifications.map((verification) => (
                <div 
                  key={verification.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">{verification.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {verification.address}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {verification.owner_name} ({verification.owner_email})
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted: {format(new Date(verification.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Documents: {verification.verification_documents?.length || 0} file(s)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Pending Review
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedVerification(verification)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disputes with Checkout Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Disputes with Checkout Photos
          </CardTitle>
          <CardDescription>
            Review checkout photos for active disputes (photos are retained for 24 hours after booking ends)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disputesWithPhotos.length === 0 ? (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                No disputes with available checkout photos.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {disputesWithPhotos.map((dispute) => (
                <div 
                  key={dispute.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{dispute.spot_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Type: {dispute.dispute_type}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {dispute.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Filed: {format(new Date(dispute.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {dispute.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedDispute(dispute)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Photo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Review Dialog */}
      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Verification: {selectedVerification?.title}</DialogTitle>
            <DialogDescription>
              Review the submitted documents and approve or reject this verification request.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVerification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Spot Address</p>
                  <p className="text-muted-foreground">{selectedVerification.address}</p>
                </div>
                <div>
                  <p className="font-medium">Owner</p>
                  <p className="text-muted-foreground">
                    {selectedVerification.owner_name} ({selectedVerification.owner_email})
                  </p>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Uploaded Documents</p>
                <div className="space-y-2">
                  {selectedVerification.verification_documents?.map((docPath, index) => (
                    <DocumentViewer key={index} path={docPath} index={index} />
                  ))}
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Review Notes</p>
                <Textarea
                  placeholder="Add notes about this verification (required for rejection)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedVerification(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedVerification && handleRejectVerification(selectedVerification.id)}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
            <Button 
              onClick={() => selectedVerification && handleApproveVerification(selectedVerification.id)}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Photo Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Checkout Photo for Dispute</DialogTitle>
            <DialogDescription>
              Review the checkout photo submitted for this dispute.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>Spot:</strong> {selectedDispute.spot_title}</p>
                <p><strong>Dispute Type:</strong> {selectedDispute.dispute_type}</p>
                <p><strong>Description:</strong> {selectedDispute.description}</p>
              </div>

              {selectedDispute.checkout_photo_url && (
                <CheckoutPhotoViewer path={selectedDispute.checkout_photo_url} />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Document viewer component
const DocumentViewer = ({ path, index }: { path: string; index: number }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const { data } = await supabase.storage
          .from('verification-documents')
          .createSignedUrl(path, 3600);
        setUrl(data?.signedUrl || null);
      } catch (error) {
        console.error('Error fetching document URL:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUrl();
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading document...</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded text-red-600">
        <XCircle className="w-4 h-4" />
        <span>Failed to load document</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 border rounded">
      <FileText className="w-4 h-4 text-muted-foreground" />
      <span>Document {index + 1}</span>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="ml-auto flex items-center gap-1 text-primary hover:underline"
      >
        <ExternalLink className="w-4 h-4" />
        View
      </a>
    </div>
  );
};

// Checkout photo viewer component
const CheckoutPhotoViewer = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const { data } = await supabase.storage
          .from('parking-images')
          .createSignedUrl(path, 3600);
        setUrl(data?.signedUrl || null);
      } catch (error) {
        console.error('Error fetching photo URL:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUrl();
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded bg-muted">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center p-8 border rounded bg-red-50 text-red-600">
        <XCircle className="w-6 h-6 mr-2" />
        <span>Photo not available (may have been deleted after 24 hours)</span>
      </div>
    );
  }

  return (
    <div className="border rounded overflow-hidden">
      <img 
        src={url} 
        alt="Checkout verification photo" 
        className="w-full max-h-96 object-contain bg-gray-100"
      />
      <div className="p-2 bg-muted text-xs text-muted-foreground">
        This photo was taken at checkout and will be automatically deleted 24 hours after the booking ended.
      </div>
    </div>
  );
};

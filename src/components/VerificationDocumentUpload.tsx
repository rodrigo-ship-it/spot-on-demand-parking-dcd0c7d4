import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Shield, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerificationDocumentUploadProps {
  spotId: string;
  userId: string;
  currentStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  existingDocuments?: string[];
  onStatusChange?: (status: string) => void;
}

export const VerificationDocumentUpload = ({
  spotId,
  userId,
  currentStatus = 'unverified',
  existingDocuments = [],
  onStatusChange
}: VerificationDocumentUploadProps) => {
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingDocuments);

  const acceptedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`${file.name}: Unsupported file type. Please upload images or PDFs.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name}: File too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setDocuments(prev => [...prev, ...validFiles]);
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (documents.length === 0) {
      toast.error("Please select at least one document to upload");
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of documents) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${spotId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Get the URL (private bucket, so we store the path)
        newUrls.push(data.path);
      }

      // Update parking spot with verification documents and status
      const allDocuments = [...uploadedUrls, ...newUrls];
      
      const { error: updateError } = await supabase
        .from('parking_spots')
        .update({
          verification_documents: allDocuments,
          verification_status: 'pending'
        })
        .eq('id', spotId);

      if (updateError) {
        throw updateError;
      }

      setUploadedUrls(allDocuments);
      setDocuments([]);
      onStatusChange?.('pending');
      toast.success("Documents uploaded successfully! Your verification is now pending review.");

    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast.error(error.message || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const getStatusInfo = () => {
    switch (currentStatus) {
      case 'verified':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          message: 'Your ownership has been verified!'
        };
      case 'pending':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          message: 'Your verification is being reviewed. This usually takes 1-2 business days.'
        };
      case 'rejected':
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          message: 'Your verification was not approved. Please upload clearer documents.'
        };
      default:
        return {
          icon: Shield,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          message: 'Verify your ownership to build trust with renters.'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={`border ${statusInfo.bgColor}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Ownership Verification
        </CardTitle>
        <CardDescription>
          Upload documents to prove you own or manage this parking spot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <Alert className={statusInfo.bgColor}>
          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
          <AlertDescription className={statusInfo.color}>
            {statusInfo.message}
          </AlertDescription>
        </Alert>

        {/* Only show upload section if not verified */}
        {currentStatus !== 'verified' && (
          <>
            {/* Document Types Info */}
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Accepted documents:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Property deed or title</li>
                <li>Lease agreement</li>
                <li>Utility bill showing address</li>
                <li>Property tax statement</li>
                <li>HOA authorization letter</li>
              </ul>
            </div>

            {/* Uploaded Documents */}
            {uploadedUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Uploaded Documents ({uploadedUrls.length})</p>
                <div className="flex flex-wrap gap-2">
                  {uploadedUrls.map((url, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Document {index + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Files */}
            {documents.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Selected Files</p>
                <div className="space-y-2">
                  {documents.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Input */}
            <div className="space-y-2">
              <input
                type="file"
                id="verification-docs"
                multiple
                accept={acceptedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor="verification-docs">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  asChild
                  disabled={uploading}
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Documents
                  </span>
                </Button>
              </label>
            </div>

            {/* Submit Button */}
            {documents.length > 0 && (
              <Button
                onClick={uploadDocuments}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

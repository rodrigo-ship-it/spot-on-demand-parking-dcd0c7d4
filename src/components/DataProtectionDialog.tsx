import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Download, Trash2, Shield, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { dataProtectionService } from '@/lib/dataProtection';
import { useAuth } from '@/contexts/AuthContext';

interface DataProtectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DataProtectionDialog: React.FC<DataProtectionDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const exportData = await dataProtectionService.exportUserData(user.id);
      
      if (exportData) {
        // Create and download file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Data Exported",
          description: "Your data has been successfully exported and downloaded.",
        });
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const success = await dataProtectionService.deleteUserData(user.id);
      
      if (success) {
        toast({
          title: "Data Deleted",
          description: "All your data has been permanently deleted from our systems.",
        });
        onOpenChange(false);
        // In a real app, you'd redirect to a goodbye page or sign the user out
      } else {
        throw new Error('Failed to delete data');
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete your data. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Protection & Privacy
          </DialogTitle>
          <DialogDescription>
            Manage your personal data and privacy settings in compliance with GDPR and other privacy regulations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-4 w-4" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a complete copy of all your personal data stored in our system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This includes your profile information, booking history, vehicle details, 
                payment methods (excluding sensitive payment data), reviews, and security logs.
              </p>
              <Button 
                onClick={handleExportData} 
                disabled={isExporting}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export My Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Data Deletion Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete All Data
              </CardTitle>
              <CardDescription>
                Permanently delete all your personal data from our system (Right to be Forgotten).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. All your data, including 
                  bookings, reviews, and account information will be permanently deleted.
                </AlertDescription>
              </Alert>

              {!showDeleteConfirmation ? (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Request Data Deletion
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-center font-medium">
                    Are you absolutely sure you want to delete all your data?
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteData}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privacy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4" />
                Your Privacy Rights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Right to Access:</strong> You can request and receive information about the personal data we process.
                </div>
                <div>
                  <strong>Right to Rectification:</strong> You can correct inaccurate or incomplete data through your profile settings.
                </div>
                <div>
                  <strong>Right to Erasure:</strong> You can request deletion of your personal data using the option above.
                </div>
                <div>
                  <strong>Right to Portability:</strong> You can download your data in a machine-readable format.
                </div>
                <div>
                  <strong>Right to Object:</strong> You can object to certain types of data processing through notification settings.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
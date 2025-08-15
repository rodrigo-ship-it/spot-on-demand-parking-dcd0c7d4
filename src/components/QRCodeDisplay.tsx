import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { DOMAIN_CONFIG } from "@/config/domain";

interface QRCodeDisplayProps {
  spotId: string;
  spotTitle: string;
}

const QRCodeDisplay = ({ spotId, spotTitle }: QRCodeDisplayProps) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [spotId]);

  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      const rentUrl = DOMAIN_CONFIG.generateQRCodeUrl(spotId);
      console.log('QR Code generating URL:', rentUrl);
      const qrDataURL = await QRCode.toDataURL(rentUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataURL(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataURL) return;
    
    const link = document.createElement('a');
    link.download = `parking-spot-${spotId}-qr.png`;
    link.href = qrCodeDataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded!");
  };

  const handleCopyLink = async () => {
    const rentUrl = DOMAIN_CONFIG.generateQRCodeUrl(spotId);
    try {
      await navigator.clipboard.writeText(rentUrl);
      toast.success("Rental link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="w-5 h-5 mr-2" />
            QR Code for Instant Rental
          </CardTitle>
          <CardDescription>
            Generating QR code for {spotTitle}...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="w-64 h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <QrCode className="w-16 h-16 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="w-5 h-5 mr-2" />
          QR Code for Instant Rental
        </CardTitle>
        <CardDescription>
          Customers can scan this code to rent {spotTitle} instantly without creating an account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <img 
            src={qrCodeDataURL} 
            alt="QR Code for parking spot rental"
            className="w-64 h-64 border border-gray-200 rounded-lg"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
          <Button 
            onClick={handleCopyLink}
            variant="outline"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Customers scan the QR code with their phone</li>
            <li>• They enter rental duration and contact info</li>
            <li>• Payment is processed instantly via Stripe</li>
            <li>• No app download or account creation required</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Share2, QrCode, Check } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  spotId: string;
  spotTitle: string;
  spotAddress: string;
}

export const QRCodeGenerator = ({ spotId, spotTitle, spotAddress }: QRCodeGeneratorProps) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const rentUrl = `${window.location.origin}/rent-qr/${spotId}`;

  useEffect(() => {
    generateQRCode();
  }, [spotId]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      const dataURL = await QRCode.toDataURL(rentUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataURL(dataURL);
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
    link.href = qrCodeDataURL;
    link.download = `parking-spot-${spotId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded!");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(rentUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rent parking: ${spotTitle}`,
          text: `Quick rental available at ${spotAddress}`,
          url: rentUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Instant Rental QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex justify-center">
          {isGenerating ? (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg border">
              <img 
                src={qrCodeDataURL} 
                alt="QR Code for instant rental" 
                className="w-64 h-64"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button 
            onClick={handleDownload} 
            variant="outline" 
            disabled={!qrCodeDataURL}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <Button 
            onClick={handleCopyLink} 
            variant="outline"
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleShare} 
            variant="outline"
            className="w-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How Instant Rental Works</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Customers scan the QR code or visit the link</li>
            <li>• They select rental duration and pay instantly</li>
            <li>• No account creation required</li>
            <li>• You receive notifications and payment automatically</li>
          </ul>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Ready for Instant Rentals
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
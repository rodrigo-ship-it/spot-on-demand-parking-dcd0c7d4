// Domain configuration for QR codes and links
export const DOMAIN_CONFIG = {
  // Temporarily using Lovable URL until custom domain routing is fixed
  customDomain: "https://801a0f2c-c78b-4fa0-9871-10f04e2f55b7.lovableproject.com",
  
  // Helper function to get the correct domain for QR codes
  getQRCodeDomain: () => {
    return DOMAIN_CONFIG.customDomain;
  },
  
  // Helper function to generate QR code URLs
  generateQRCodeUrl: (spotId: string) => {
    return `${DOMAIN_CONFIG.getQRCodeDomain()}/book-spot/${spotId}?action=book&qr=true`;
  }
};
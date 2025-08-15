// Domain configuration for QR codes and links
export const DOMAIN_CONFIG = {
  // Your custom domain
  customDomain: "https://arrivparking.com",
  
  // Helper function to get the correct domain for QR codes
  getQRCodeDomain: () => {
    return DOMAIN_CONFIG.customDomain;
  },
  
  // Helper function to generate QR code URLs - using spot details page since it works
  generateQRCodeUrl: (spotId: string) => {
    return `${DOMAIN_CONFIG.getQRCodeDomain()}/spot/${spotId}?action=book&qr=true`;
  }
};
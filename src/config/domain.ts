// Domain configuration for QR codes and links
export const DOMAIN_CONFIG = {
  // Your custom domain
  customDomain: "https://settldparking.com",
  
  // Helper function to get the correct domain for QR codes
  getQRCodeDomain: () => {
    return DOMAIN_CONFIG.customDomain;
  },
  
  // Helper function to generate QR code URLs - same view as eye button on manage spots
  generateQRCodeUrl: (spotId: string) => {
    return `${DOMAIN_CONFIG.getQRCodeDomain()}/spot/${spotId}`;
  }
};
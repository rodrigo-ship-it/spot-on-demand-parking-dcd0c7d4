// Domain configuration for QR codes and links
// Update this with your actual custom domain
export const DOMAIN_CONFIG = {
  // Replace this with your actual custom domain once you set it up
  // For now using the current domain, but you should update this
  customDomain: "https://801a0f2c-c78b-4fa0-9871-10f04e2f55b7.lovableproject.com",
  
  // Helper function to get the correct domain for QR codes
  getQRCodeDomain: () => {
    // You can update this logic to use environment variables or other config
    return DOMAIN_CONFIG.customDomain;
  },
  
  // Helper function to generate QR code URLs
  generateQRCodeUrl: (spotId: string) => {
    return `${DOMAIN_CONFIG.getQRCodeDomain()}/book-spot/${spotId}?action=book&qr=true`;
  }
};
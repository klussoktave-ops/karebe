/**
 * Branch M-Pesa Configuration Manager
 * Manages till/paybill numbers per branch with defaults
 */

export interface MpesaConfig {
  branchId: string;
  tillNumber: string;
  businessName: string;
  isDefault?: boolean;
  serviceArea?: string[];
  phoneNumber?: string; // For paybill
  accountNumber?: string; // For paybill
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MpesaDisplayData {
  tillNumber: string;
  formattedNumber: string;
  businessName: string;
  qrCodeUrl: string;
  instructions: string[];
  copyButton: boolean;
}

export class BranchMpesaManager {
  private configs: Map<string, MpesaConfig> = new Map();
  private defaultBranchId: string | null = null;

  /**
   * Set M-Pesa configuration for a branch
   */
  async setMpesaConfig(params: {
    branchId: string;
    tillNumber: string;
    businessName: string;
    isDefault?: boolean;
    serviceArea?: string[];
    phoneNumber?: string;
  }): Promise<MpesaConfig> {
    const now = new Date().toISOString();
    
    const config: MpesaConfig = {
      branchId: params.branchId,
      tillNumber: params.tillNumber,
      businessName: params.businessName,
      isDefault: params.isDefault || false,
      serviceArea: params.serviceArea || [],
      phoneNumber: params.phoneNumber,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.configs.set(params.branchId, config);

    if (params.isDefault) {
      // Unset previous default
      if (this.defaultBranchId) {
        const prev = this.configs.get(this.defaultBranchId);
        if (prev) {
          prev.isDefault = false;
          this.configs.set(this.defaultBranchId, prev);
        }
      }
      this.defaultBranchId = params.branchId;
    }

    return config;
  }

  /**
   * Get configuration for a specific branch
   */
  async getConfig(branchId: string): Promise<MpesaConfig | null> {
    return this.configs.get(branchId) || null;
  }

  /**
   * Get default configuration
   */
  async getDefaultConfig(): Promise<MpesaConfig> {
    if (this.defaultBranchId) {
      const config = this.configs.get(this.defaultBranchId);
      if (config) return config;
    }

    // Fallback to first active config
    for (const config of this.configs.values()) {
      if (config.isActive) return config;
    }

    throw new Error('No M-Pesa configuration found');
  }

  /**
   * Find branch by service area/location
   */
  async findBranchByLocation(location: string): Promise<MpesaConfig | null> {
    const locationLower = location.toLowerCase();
    
    for (const config of this.configs.values()) {
      if (config.serviceArea?.some(area => 
        area.toLowerCase().includes(locationLower) || 
        locationLower.includes(area.toLowerCase())
      )) {
        return config;
      }
    }

    return null;
  }

  /**
   * Get configuration for a location (with fallback to default)
   */
  async getConfigForLocation(location: string): Promise<MpesaConfig> {
    const branch = await this.findBranchByLocation(location);
    if (branch) return branch;
    return this.getDefaultConfig();
  }

  /**
   * Get display data for checkout UI
   */
  async getCheckoutDisplay(branchId?: string): Promise<MpesaDisplayData> {
    let config: MpesaConfig;
    
    if (branchId) {
      const found = await this.getConfig(branchId);
      config = found || await this.getDefaultConfig();
    } else {
      config = await this.getDefaultConfig();
    }

    return {
      tillNumber: config.tillNumber,
      formattedNumber: this.formatTillNumber(config.tillNumber),
      businessName: config.businessName,
      qrCodeUrl: this.generateQRCode(config.tillNumber),
      instructions: [
        'Go to M-Pesa on your phone',
        'Select Lipa na M-Pesa',
        'Select Buy Goods and Services',
        `Enter Till Number: ${config.tillNumber}`,
        `Enter Amount`,
        'Enter your M-Pesa PIN',
      ],
      copyButton: true,
    };
  }

  /**
   * Get accessible display for high contrast/large text
   */
  async getAccessibleDisplay(params: {
    branchId?: string;
    highContrast?: boolean;
    largeText?: boolean;
  }): Promise<{
    tillNumber: string;
    contrastRatio: number;
    fontSize: string;
    backgroundColor: string;
    textColor: string;
    instructions: string[];
  }> {
    const config = params.branchId 
      ? await this.getConfig(params.branchId) || await this.getDefaultConfig()
      : await this.getDefaultConfig();

    return {
      tillNumber: config.tillNumber,
      contrastRatio: params.highContrast ? 7.0 : 4.5,
      fontSize: params.largeText ? '2rem' : '1.5rem',
      backgroundColor: params.highContrast ? '#000000' : '#FFFFFF',
      textColor: params.highContrast ? '#FFFFFF' : '#000000',
      instructions: [
        'STEP 1: Open M-Pesa',
        'STEP 2: Lipa na M-Pesa',
        'STEP 3: Buy Goods',
        `STEP 4: Enter ${config.tillNumber}`,
        'STEP 5: Enter Amount',
        'STEP 6: Enter PIN',
      ],
    };
  }

  /**
   * Format till number with spaces for readability
   */
  private formatTillNumber(tillNumber: string): string {
    // Format as 123 456 or 12345 67890
    if (tillNumber.length <= 6) {
      const mid = Math.ceil(tillNumber.length / 2);
      return `${tillNumber.slice(0, mid)} ${tillNumber.slice(mid)}`;
    }
    return tillNumber.replace(/(\d{5})(\d+)/, '$1 $2');
  }

  /**
   * Generate QR code URL for till number
   */
  private generateQRCode(tillNumber: string): string {
    // Using a QR code generation service
    const data = encodeURIComponent(`Lipa na M-Pesa Till: ${tillNumber}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}`;
  }

  /**
   * Get all configurations
   */
  async getAllConfigs(): Promise<MpesaConfig[]> {
    return Array.from(this.configs.values());
  }

  /**
   * Deactivate a branch configuration
   */
  async deactivateConfig(branchId: string): Promise<boolean> {
    const config = this.configs.get(branchId);
    if (config) {
      config.isActive = false;
      config.updatedAt = new Date().toISOString();
      this.configs.set(branchId, config);
      return true;
    }
    return false;
  }
}

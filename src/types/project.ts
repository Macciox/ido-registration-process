// Project types for the IDO registration process

export type FieldStatus = 'Confirmed' | 'Not Confirmed' | 'Might Still Change';

export interface ProjectField<T> {
  value: T;
  status: FieldStatus;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string]; // Four options A-D
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export interface PublicRoundMetrics {
  whitelistingStartTime: ProjectField<string>;
  idoLaunchDate: ProjectField<string>;
  tokenClaimingDate: ProjectField<string>;
  cexDexListingDate: ProjectField<string>;
  tokenPrice: ProjectField<string>;
  allocationUSD: ProjectField<string>;
  allocationTokenAmount: ProjectField<string>;
  tgeUnlockPercentage: ProjectField<string>;
  cliffLock: ProjectField<string>;
  vestingDuration: ProjectField<string>;
  tokenTicker: ProjectField<string>;
  network: ProjectField<string>;
  gracePeriod: ProjectField<string>;
  tokenContractAddress: ProjectField<string>;
  tokenTransferTxId: ProjectField<string>;
}

export interface TokenInfo {
  initialMarketCapExLiquidity: ProjectField<string>;
  initialMarketCap: ProjectField<string>;
  fullyDilutedMarketCap: ProjectField<string>;
  circulatingSupplyAtTge: ProjectField<string>;
  tgeSupplyPercentage: ProjectField<string>;
}

export interface PlatformSetup {
  tagline: ProjectField<string>;
  projectDescription: ProjectField<string>;
  telegram: ProjectField<string>;
  twitter: ProjectField<string>;
  discord: ProjectField<string>;
  youtube: ProjectField<string>;
  linkedin: ProjectField<string>;
  tokenomicsFile: ProjectField<string>;
  teamPage: ProjectField<string>;
  roadmapPage: ProjectField<string>;
}

export interface Project {
  id: string;
  name: string;
  ownerEmail: string;
  publicRoundMetrics: PublicRoundMetrics;
  tokenInfo: TokenInfo;
  platformSetup: PlatformSetup;
  faqs: FAQ[];
  quizQuestions: QuizQuestion[];
  marketingKit: ProjectField<string>; // URL to Google Drive or file upload
  createdAt: string;
  updatedAt: string;
}
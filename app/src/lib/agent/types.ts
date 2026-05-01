export type VaultProposal = {
  kind: "create_vault";
  params: {
    name: string;
    beneficiaryAddress: string;
    heartbeatIntervalSec: number;
    depositAmountPusd: number;
    depositAmountBaseUnits: string; // bigint serialized
  };
  summary: {
    heartbeatHumanReadable: string;
    depositHumanReadable: string;
    beneficiaryShort: string;
  };
};

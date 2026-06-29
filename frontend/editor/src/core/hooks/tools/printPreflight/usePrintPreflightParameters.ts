import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

export interface PrintPreflightParameters extends BaseParameters {
  bleedSizeInches: number;
  addCropMarks: boolean;
}

export const defaultParameters: PrintPreflightParameters = {
  bleedSizeInches: 0.125,
  addCropMarks: true,
};

export type PrintPreflightParametersHook =
  BaseParametersHook<PrintPreflightParameters>;

export const usePrintPreflightParameters = (): PrintPreflightParametersHook => {
  return useBaseParameters({
    defaultParameters,
    endpointName: "print-preflight",
    validateFn: (params) => params.bleedSizeInches > 0,
  });
};

import { CitationMetadata, CitationStyle } from "./types";
import { formatAPA } from "./apa";
import { formatMLA } from "./mla";
import { formatChicago } from "./chicago";
import { formatIEEE } from "./ieee";
import { formatHarvard } from "./harvard";
import { formatVancouver } from "./vancouver";

export function formatCitation(meta: CitationMetadata, style: CitationStyle): string {
  switch (style) {
    case "APA":
      return formatAPA(meta);
    case "MLA":
      return formatMLA(meta);
    case "CHICAGO":
      return formatChicago(meta);
    case "IEEE":
      return formatIEEE(meta);
    case "HARVARD":
      return formatHarvard(meta);
    case "VANCOUVER":
      return formatVancouver(meta);
    default:
      return formatAPA(meta);
  }
}

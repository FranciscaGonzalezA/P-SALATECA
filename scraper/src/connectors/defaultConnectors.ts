import type { HttpClient } from '../http/httpClient.js';
import { CinetecaConnector } from './cinetecaConnector.js';
import { ElBiografoConnector } from './elBiografoConnector.js';
import { M100Connector } from './m100Connector.js';
import { NormandieConnector } from './normandieConnector.js';
import { SalaKConnector } from './salaKConnector.js';
import type { SourceConnector } from './sourceConnector.js';

export function createDefaultConnectors(http: HttpClient): SourceConnector[] {
  return [
    new NormandieConnector(http),
    new ElBiografoConnector(http),
    new SalaKConnector(http),
    new M100Connector(http),
    new CinetecaConnector(http),
  ];
}

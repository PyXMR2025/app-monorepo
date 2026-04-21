import { Command } from 'commander';
import 'fake-indexeddb/auto';

import {
  handleAuthCommandDiscoveryFallback,
  registerAuthCommands,
  registerBalanceCommand,
  registerDeviceCommands,
  registerLogoutCommand,
  registerMarketCommands,
  registerSchemaCommand,
  registerSecurityCommands,
  registerStatusCommand,
  registerSwapCommands,
  registerTokenCommands,
  registerTransferCommand,
  registerVersionCommand,
  registerWalletHistoryCommand,
} from './commands';
import { disposeSDK } from './commands/device/hardware-sdk';
import { secureCache } from './core';
import { createSignalCleanupHandler } from './core/auth/auth-flow-interruption';
import { ERROR_CODES } from './errors';
import { apiClient } from './infra';
import { OutputFormatter } from './output';
import './schemas/register-all';
import { createLogger } from './utils/logger';
import { detectOutputMode } from './utils/mode-detector';

import type { IEndpointEnv } from './config';

const program = new Command();

program
  .name('onekey')
  .description('OneKey wallet CLI for developers and AI agents')
  .version('0.1.0', '-V, --version');

program
  .option('--json', 'Force JSON output')
  .option('--interactive', 'Force interactive (human) mode')
  .option('--verbose', 'Enable verbose logging')
  .option('--quiet', 'Suppress all non-essential output')
  .option('--env <env>', 'Environment: test | prod', 'test')
  .option('--yes', 'Skip confirmation prompts');

program.hook('preAction', (_thisCommand, actionCommand) => {
  const opts = actionCommand.optsWithGlobals();
  const mode = detectOutputMode({
    json: opts.json,
    interactive: opts.interactive,
    quiet: opts.quiet,
  });
  const output = new OutputFormatter(mode);

  const env = (opts.env ?? 'test') as string;
  if (env !== 'test' && env !== 'prod') {
    output.error({
      code: ERROR_CODES.PARAM_INVALID_CONFIG.code,
      message: `Invalid --env value: "${env}"`,
      suggestion: 'Valid values: test | prod',
    });
    process.exit(ERROR_CODES.PARAM_INVALID_CONFIG.exitCode);
  }

  actionCommand.setOptionValue('_outputFormatter', output);
  const logger = createLogger({ verbose: opts.verbose, quiet: opts.quiet });
  actionCommand.setOptionValue('_logger', logger);
  apiClient.setEnv(env as IEndpointEnv);
  apiClient.setLogger(logger);
});

registerVersionCommand(program);
registerStatusCommand(program);
registerLogoutCommand(program);
registerBalanceCommand(program);
registerTransferCommand(program);
registerAuthCommands(program);

// Phase 3A command groups
registerTokenCommands(program);
registerMarketCommands(program);
registerSwapCommands(program);
registerSecurityCommands(program);
registerWalletHistoryCommand(program);
registerSchemaCommand(program);
registerDeviceCommands(program);

// Signal handlers: use Unix-conventional exit codes (128 + signal number).
// disposeHardwareSdk releases the USB transport — otherwise Node hangs ~26s
// waiting on open handles (poll timers, event listeners).
process.on(
  'SIGINT',
  createSignalCleanupHandler({
    exitCode: 130,
    clearSecureCache: () => secureCache.clearAll(),
    disposeHardwareSdk: () => disposeSDK(),
  }),
);
process.on(
  'SIGTERM',
  createSignalCleanupHandler({
    exitCode: 143,
    clearSecureCache: () => secureCache.clearAll(),
    disposeHardwareSdk: () => disposeSDK(),
  }),
);
process.on(
  'SIGHUP',
  createSignalCleanupHandler({
    exitCode: 129,
    clearSecureCache: () => secureCache.clearAll(),
    disposeHardwareSdk: () => disposeSDK(),
  }),
);

// Normal exit path: Commander actions set process.exitCode and return without
// calling process.exit(). Without disposeSDK, USB transport keeps the event
// loop alive for ~26s before Node gives up. beforeExit fires when the loop
// would otherwise idle, giving us the last chance to release it.
let sdkDisposeStarted = false;
process.on('beforeExit', () => {
  if (sdkDisposeStarted) {
    return;
  }
  sdkDisposeStarted = true;
  void disposeSDK().catch(() => {
    // Best-effort — dispose errors shouldn't block exit.
  });
});

if (!handleAuthCommandDiscoveryFallback(process.argv.slice(2))) {
  program.parse();
}

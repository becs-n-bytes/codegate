#!/usr/bin/env node

/**
 * Mock provider binary for E2E testing.
 *
 * Behavior is controlled by the prompt (last CLI argument):
 *
 *   echo:<text>                  — echo <text> to stdout
 *   create:<path>:<content>      — create a file in cwd, print confirmation
 *   modify:<path>:<content>      — overwrite a file in cwd, print confirmation
 *   slow:<ms>                    — sleep for <ms> then respond
 *   fail                         — exit with code 1
 *   fail:<message>               — print message to stderr, exit 1
 *   json                         — output a JSON object
 *   <anything else>              — echo the prompt back
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const prompt = process.argv[process.argv.length - 1] || '';

async function main() {
  if (prompt.startsWith('slow:')) {
    const ms = parseInt(prompt.split(':')[1], 10);
    await new Promise((r) => setTimeout(r, ms));
    console.log(`done after ${ms}ms`);
    return;
  }

  if (prompt === 'fail') {
    process.stderr.write('provider error\n');
    process.exit(1);
  }

  if (prompt.startsWith('fail:')) {
    const message = prompt.slice(5);
    process.stderr.write(message + '\n');
    process.exit(1);
  }

  if (prompt.startsWith('create:')) {
    const parts = prompt.split(':');
    const filePath = parts[1];
    const content = parts.slice(2).join(':');
    const fullPath = join(process.cwd(), filePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
    console.log(`Created ${filePath}`);
    return;
  }

  if (prompt.startsWith('modify:')) {
    const parts = prompt.split(':');
    const filePath = parts[1];
    const content = parts.slice(2).join(':');
    writeFileSync(join(process.cwd(), filePath), content);
    console.log(`Modified ${filePath}`);
    return;
  }

  if (prompt === 'json') {
    console.log(JSON.stringify({ result: 'structured output', exitCode: 0 }));
    return;
  }

  // Default: echo the prompt
  console.log(`echo: ${prompt}`);
}

main().catch((err) => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});

/**
 * Mautrix Bridge Verification Script
 * Tests that the mautrix-whatsapp webhook integration is working
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.ORCHESTRATION_URL || 'http://localhost:3001';
const WEBHOOK_SECRET = process.env.MAUTRIX_WEBHOOK_SECRET || 'your-webhook-secret';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  duration: number;
}

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      test: name,
      passed: result.passed,
      message: result.message,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      test: name,
      passed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

async function verifyMautrixBridge(): Promise<void> {
  console.log('🧪 Verifying Mautrix-WhatsApp Bridge Integration\n');

  const results: TestResult[] = [];

  // Test 1: Health Check
  results.push(await runTest('Health Check', async () => {
    const response = await fetch(`${BASE_URL}/api/webhook/health`);
    const data = await response.json() as { status: string };
    return {
      passed: response.ok && data.status === 'ok',
      message: `Status: ${data.status}`,
    };
  }));

  // Test 2: Webhook Endpoint (No Auth)
  results.push(await runTest('Webhook Auth Required', async () => {
    const response = await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
    return {
      passed: response.status === 401,
      message: `Expected 401, got ${response.status}`,
    };
  }));

  // Test 3: Invalid Payload
  results.push(await runTest('Invalid Payload Rejected', async () => {
    const response = await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify({ invalid: 'payload' }),
    });
    return {
      passed: response.status === 400,
      message: `Expected 400, got ${response.status}`,
    };
  }));

  // Test 4: Valid Payload - Confirm Intent
  results.push(await runTest('Confirm Intent', async () => {
    const payload = {
      event_id: `test-evt-${Date.now()}`,
      room_id: '!test:matrix.org',
      sender: '@whatsapp_254712345678:matrix.org',
      content: {
        body: 'YES',
        msgtype: 'm.text',
      },
      timestamp: Date.now(),
    };

    const response = await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { success: boolean; action?: string };
    return {
      passed: response.ok && data.success,
      message: `Action: ${data.action || 'N/A'}`,
    };
  }));

  // Test 5: Swahili Intent (NDIO)
  results.push(await runTest('Swahili Confirm (NDIO)', async () => {
    const payload = {
      event_id: `test-evt-${Date.now()}`,
      room_id: '!test:matrix.org',
      sender: '@whatsapp_254712345678:matrix.org',
      content: {
        body: 'NDIO',
        msgtype: 'm.text',
      },
      timestamp: Date.now(),
    };

    const response = await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { success: boolean; action?: string };
    return {
      passed: response.ok && data.action === 'RIDER_CONFIRMED',
      message: `Action: ${data.action}`,
    };
  }));

  // Test 6: Delivery Complete Intent
  results.push(await runTest('Delivery Complete (IMEFIKA)', async () => {
    const payload = {
      event_id: `test-evt-${Date.now()}`,
      room_id: '!test:matrix.org',
      sender: '@whatsapp_254712345678:matrix.org',
      content: {
        body: 'IMEFIKA',
        msgtype: 'm.text',
      },
      timestamp: Date.now(),
    };

    const response = await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { success: boolean; action?: string };
    return {
      passed: response.ok,
      message: `Action: ${data.action}`,
    };
  }));

  // Test 7: Duplicate Event
  const duplicateEventId = `dup-evt-${Date.now()}`;
  results.push(await runTest('Duplicate Event Prevention', async () => {
    const payload = {
      event_id: duplicateEventId,
      room_id: '!test:matrix.org',
      sender: '@whatsapp_254712345678:matrix.org',
      content: {
        body: 'TEST',
        msgtype: 'm.text',
      },
      timestamp: Date.now(),
    };

    // Send first time
    await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    // Send second time (should be ignored)
    const response = await fetch(`${BASE_URL}/api/webhook/mautrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { message?: string };
    return {
      passed: data.message === 'Duplicate event ignored',
      message: data.message || 'No message',
    };
  }));

  // Print Results
  console.log('📊 Test Results:\n');
  console.log('─'.repeat(70));

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${icon} ${status} | ${result.test}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log('─'.repeat(70));

    if (result.passed) passed++;
    else failed++;
  });

  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n✨ All tests passed! Mautrix bridge is working correctly.');
    process.exit(0);
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed. Please check the configuration.`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMautrixBridge().catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
}

export { verifyMautrixBridge };
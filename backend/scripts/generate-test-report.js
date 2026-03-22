/**
 * Đọc kết quả Jest (JSON) và ghi file báo cáo test với ngày giờ.
 * Chạy: npm run test:report (từ thư mục backend)
 */
const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, '..', 'test-cases', 'test-results.json');
const reportPath = path.join(__dirname, '..', 'test-cases', 'test-report.md');

const now = new Date();
const runAt = now.toISOString();
const runAtLocal = now.toLocaleString('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  hour12: false,
});

let data;
try {
  const raw = fs.readFileSync(resultsPath, 'utf8');
  data = JSON.parse(raw);
} catch (err) {
  const fallback = `# Test Report\n\n**Lần chạy:** ${runAtLocal} (${runAt})\n\nKhông đọc được file kết quả. Chạy: \`npm run test:report\` (sẽ chạy test trước rồi mới ghi báo cáo).\n`;
  fs.writeFileSync(reportPath, fallback, 'utf8');
  console.log('Report (fallback) written to test-cases/test-report.md');
  process.exit(0);
}

const numPassed = data.numPassedTests || 0;
const numFailed = data.numFailedTests || 0;
const total = data.numTotalTests || numPassed + numFailed;
const success = data.success !== false;
let duration = '';
if (data.startTime != null && data.testResults && data.testResults.length > 0) {
  const endTime = Math.max(...data.testResults.map((s) => s.endTime || 0));
  duration = ((endTime - data.startTime) / 1000).toFixed(2) + 's';
}

let md = '';
md += '# Báo cáo Test Case – Kính Tốt Backend\n\n';
md += '| Thông tin | Giá trị |\n|-----------|--------|\n';
md += `| **Thời gian chạy** | ${runAtLocal} |\n`;
md += `| **ISO** | ${runAt} |\n`;
md += `| **Kết quả** | ${success ? '✅ PASS' : '❌ FAIL'} |\n`;
md += `| **Tổng số test** | ${total} |\n`;
md += `| **Passed** | ${numPassed} |\n`;
md += `| **Failed** | ${numFailed} |\n`;
if (duration) md += `| **Thời gian** | ${duration} |\n`;
md += '\n---\n\n';

md += '## Chi tiết theo file\n\n';
(data.testResults || []).forEach((suite) => {
  const name = suite.name.replace(/^.*[\\/]test-cases[\\/]/, '');
  const assertions = suite.assertionResults || [];
  const passed = assertions.filter((t) => t.status === 'passed').length;
  const failed = assertions.filter((t) => t.status === 'failed').length;
  md += `### ${name}\n`;
  md += `- Passed: ${passed}, Failed: ${failed}\n`;
  if (suite.assertionResults && suite.assertionResults.length > 0) {
    md += '| Test | Kết quả |\n|------|--------|\n';
    suite.assertionResults.forEach((t) => {
      const status = t.status === 'passed' ? '✅' : '❌';
      const title = (t.fullName || t.title || '').replace(/\|/g, ' ');
      md += `| ${title} | ${status} |\n`;
    });
  }
  md += '\n';
});

fs.writeFileSync(reportPath, md, 'utf8');
console.log(`Báo cáo đã ghi: ${reportPath}`);
console.log(`Kết quả: ${numPassed}/${total} passed, ${numFailed} failed.`);

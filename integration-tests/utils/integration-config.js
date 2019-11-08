const {
  TEST_URL: testUrl = 'http://localhost:3000',
  TERRA_TOKEN: bearerToken,
  BILLING_PROJECT: billingProject = 'general-dev-billing-account',
  WORKFLOW_NAME: workflowName = 'echo_to_file',
  SCREENSHOT_DIR: screenshotDir
} = process.env

module.exports = {
  bearerToken,
  billingProject,
  testUrl,
  workflowName,
  screenshotDir
}

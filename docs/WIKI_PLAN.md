# Wiki Plan

The GitHub Wiki should mirror the project documentation without becoming the only source of truth. Canonical technical specifications stay versioned in the repository; the Wiki provides a friendlier navigation layer.

## Proposed pages

1. Home
2. Architecture
3. Customer Identity Map
4. Event Ledger
5. Lifecycle States
6. Reconciliation
7. MCP Operator Layer
8. Webhook Architecture
9. Adapter Development
10. Square Adapter
11. MailerLite Adapter
12. Trafft Adapter
13. Supabase Deployment
14. Security Model
15. Public / Private Boundary
16. Example Workflows
17. Troubleshooting
18. Roadmap
19. FAQ

## Home page outline

- what the Lifecycle Engine is
- what problem it solves
- architecture diagram
- quickstart path
- current project status
- links to core concepts and adapters

## Documentation rule

If the Wiki and repository documentation disagree, repository documentation wins. Important architectural/security changes must land in the repository through pull request review first, then the Wiki can be refreshed from those canonical docs.

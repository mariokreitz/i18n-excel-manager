# Contribution Guidelines

Thank you for your interest in contributing to i18n-excel-manager! Every contribution is appreciated and helps improve
this tool.

## Code of Conduct

This project follows a Code of Conduct that encourages respectful and inclusive behavior. We expect all contributors to
adhere to this code:

- Show respect and courtesy to other participants
- Accept constructive criticism
- Focus on what is best for the community
- Avoid personal attacks or derogatory comments

## How can I contribute?

### Reporting Issues

- Use the issue template on GitHub
- Check first if the issue has already been reported
- Provide detailed information:
  - Steps to reproduce
  - Expected vs. actual behavior
  - Tool version and environment

### Pull Requests

1. Fork the repository and create a feature branch from the `main` branch
2. Keep your changes focused – a PR should address a single feature or bugfix
3. Add tests for new functionality
4. Make sure all tests pass
5. Update the documentation accordingly
6. Follow the coding standards (see below)

### Development Process

```bash
# Clone the repository
git clone https://github.com/mariokreitz/i18n-excel-manager.git
cd i18n-excel-manager

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint
```

## Style Guidelines

### Code Style

- We use ESLint and Prettier for code formatting
- Follow the established style in the existing code
- Use meaningful variable and function names
- Document new code with JSDoc comments

### Commit Messages

Follow the conventional commit format:

```
<type>(optional scope): <description>

[optional body]

[optional footer(s)]
```

Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the code (formatting, missing semicolons, etc.)
- `refactor`: Code change that neither adds a feature nor fixes a bug
- `perf`: Code change that improves performance
- `test`: Adding or correcting tests
- `build`: Changes to the build system or external dependencies
- `ci`: Changes to CI configuration

### Tests

- Write tests for all new features and bugfixes
- Run all tests locally before submitting a PR
- Aim for high test coverage

## Documentation

- Keep the README.md up to date
- Document new features and CLI options
- Add JSDoc comments for new functions and methods

## Release Process

The release process is managed by the project maintainer:

1. Version changes are marked with appropriate Git tags
2. An automatic GitHub Action publishes new releases to npm
3. Semantic versioning (MAJOR.MINOR.PATCH) is strictly followed

## Questions?

If you have questions or need help, please open an issue with the label "question".

Thank you for your contributions!

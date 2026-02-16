export interface EnvironmentItem {
  id: string;
  name: string;
  pythonVersion: string;
  interpreterPath: string;
  location: string;
}

export interface PackageItem {
  id: string;
  name: string;
  version: string;
  latest: string;
  summary: string;
  license: string;
  homePage: string;
}

export const environments: EnvironmentItem[] = [
  {
    id: 'proj_env',
    name: 'proj_env',
    pythonVersion: 'Python 3.9.7',
    interpreterPath: '/home/user/.virtualenvs/proj_env',
    location: '/home/user/.virtualenvs/proj_env'
  },
  {
    id: 'data_venv',
    name: 'data_venv',
    pythonVersion: 'Python 3.11.6',
    interpreterPath: '/home/user/.virtualenvs/data_venv',
    location: '/home/user/.virtualenvs/data_venv'
  },
  {
    id: 'test_env',
    name: 'test_env',
    pythonVersion: 'Python 3.10.13',
    interpreterPath: '/home/user/.virtualenvs/test_env',
    location: '/home/user/.virtualenvs/test_env'
  },
  {
    id: 'old_project',
    name: 'old_project',
    pythonVersion: 'Python 3.8.18',
    interpreterPath: '/home/user/.virtualenvs/old_project',
    location: '/home/user/.virtualenvs/old_project'
  }
];

export const packagesByEnvironment: Record<string, PackageItem[]> = {
  proj_env: [
    {
      id: 'requests',
      name: 'requests',
      version: '2.26.0',
      latest: '2.28.1',
      summary: 'Elegant and simple HTTP library for Python.',
      license: 'Apache-2.0',
      homePage: 'https://requests.readthedocs.io/'
    },
    {
      id: 'numpy',
      name: 'numpy',
      version: '1.21.4',
      latest: '1.22.3',
      summary: 'Fundamental package for scientific computing with Python.',
      license: 'BSD-3-Clause',
      homePage: 'https://numpy.org/'
    },
    {
      id: 'pandas',
      name: 'pandas',
      version: '1.3.3',
      latest: '1.5.0',
      summary: 'Data analysis and manipulation toolkit for Python.',
      license: 'BSD-3-Clause',
      homePage: 'https://pandas.pydata.org/'
    },
    {
      id: 'beautifulsoup4',
      name: 'beautifulsoup4',
      version: '4.9.3',
      latest: '4.11.1',
      summary: 'Library for pulling structured data out of HTML and XML files.',
      license: 'MIT',
      homePage: 'https://www.crummy.com/software/BeautifulSoup/'
    }
  ],
  data_venv: [
    {
      id: 'duckdb',
      name: 'duckdb',
      version: '0.9.1',
      latest: '0.10.0',
      summary: 'In-process analytical database management system.',
      license: 'MIT',
      homePage: 'https://duckdb.org/'
    },
    {
      id: 'polars',
      name: 'polars',
      version: '0.19.3',
      latest: '0.20.17',
      summary: 'Lightning-fast DataFrame library for data engineering.',
      license: 'MIT',
      homePage: 'https://pola.rs/'
    },
    {
      id: 'pyarrow',
      name: 'pyarrow',
      version: '14.0.1',
      latest: '15.0.2',
      summary: 'Apache Arrow Python integration.',
      license: 'Apache-2.0',
      homePage: 'https://arrow.apache.org/docs/python/'
    }
  ],
  test_env: [
    {
      id: 'pytest',
      name: 'pytest',
      version: '7.3.2',
      latest: '8.1.1',
      summary: 'Simple and powerful testing framework.',
      license: 'MIT',
      homePage: 'https://docs.pytest.org/'
    },
    {
      id: 'pytest-cov',
      name: 'pytest-cov',
      version: '4.1.0',
      latest: '5.0.0',
      summary: 'Coverage plugin for pytest.',
      license: 'MIT',
      homePage: 'https://pytest-cov.readthedocs.io/'
    },
    {
      id: 'mypy',
      name: 'mypy',
      version: '1.4.1',
      latest: '1.10.0',
      summary: 'Optional static typing for Python.',
      license: 'MIT',
      homePage: 'https://mypy-lang.org/'
    }
  ],
  old_project: [
    {
      id: 'flask',
      name: 'flask',
      version: '2.0.3',
      latest: '3.0.2',
      summary: 'Lightweight WSGI web application framework.',
      license: 'BSD-3-Clause',
      homePage: 'https://flask.palletsprojects.com/'
    },
    {
      id: 'sqlalchemy',
      name: 'sqlalchemy',
      version: '1.4.50',
      latest: '2.0.29',
      summary: 'Comprehensive SQL toolkit and Object Relational Mapper.',
      license: 'MIT',
      homePage: 'https://www.sqlalchemy.org/'
    },
    {
      id: 'alembic',
      name: 'alembic',
      version: '1.11.2',
      latest: '1.13.1',
      summary: 'Database migrations tool for SQLAlchemy.',
      license: 'MIT',
      homePage: 'https://alembic.sqlalchemy.org/'
    }
  ]
};

export const initialConsoleLines: string[] = [
  '[boot] ui initialized',
  '[boot] loaded mock environment list',
  '[ready] waiting for user action'
];

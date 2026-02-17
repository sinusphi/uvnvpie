import type { EnvironmentItem } from '../types/domain';

interface EnvironmentsListProps {
  environments: EnvironmentItem[];
  selectedEnvironmentId: string;
  onSelectEnvironment: (environmentId: string) => void;
}

export default function EnvironmentsList({
  environments,
  selectedEnvironmentId,
  onSelectEnvironment
}: EnvironmentsListProps) {
  return (
    <ul className="environments-list" aria-label="Environment list">
      {environments.map((environment) => {
        const isSelected = environment.id === selectedEnvironmentId;

        return (
          <li key={environment.id}>
            <button
              type="button"
              className={`environment-entry${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectEnvironment(environment.id)}
            >
              <span className="environment-dot" aria-hidden="true" />
              <span>{environment.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

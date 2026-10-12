import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeverityBadge, StatusBadge, HealthBadge } from "../src/components/Badge";
import { KpiCard } from "../src/components/KpiCard";
import { RoleSwitcher } from "../src/components/RoleSwitcher";
import { useUIStore } from "../src/state/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

describe("Badges", () => {
  it("renders SeverityBadge correctly", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders StatusBadge correctly", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("renders HealthBadge correctly", () => {
    render(<HealthBadge label="on_track" />);
    expect(screen.getByText("On track")).toBeInTheDocument();
  });
});

describe("KpiCard", () => {
  it("renders label, value and target", () => {
    render(
      <KpiCard
        label="Registrations"
        kpi={{ value: 140, target: 300, pace: 1.6, required_pace: 4.0 }}
        showPace
      />
    );
    expect(screen.getByText("Registrations")).toBeInTheDocument();
    expect(screen.getByText("140")).toBeInTheDocument();
    expect(screen.getByText(/300.*target/)).toBeInTheDocument();
    expect(screen.getByText(/1.6/)).toBeInTheDocument();
  });
});

describe("RoleSwitcher & Store", () => {
  it("switches role in state on change", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RoleSwitcher />
      </QueryClientProvider>
    );
    const select = screen.getByLabelText("Switch role") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "marketing" } });
    expect(useUIStore.getState().role).toBe("marketing");
  });
});

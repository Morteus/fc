// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\app\context\DateContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  ReactNode,
} from "react";

// Define the type for the filter
export type TimeFilter = "Daily" | "Weekly" | "Monthly";

// Define the shape of the context data including the filter
interface DateContextType {
  // Renamed interface for clarity
  selectedYear: number;
  selectedMonth: string; // e.g., "Jan", "Feb"
  selectedFilter: TimeFilter; // Add filter state
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedFilter: (filter: TimeFilter) => void; // Add filter setter
  selectedCurrency: string; // <-- Add selectedCurrency
  setSelectedCurrency: (currency: string) => void; // <-- Add setter for currency
  selectedDateString: string; // Formatted string like "Jan 2024"
}

// Create the context with a default value matching the interface
const DateContext = createContext<DateContextType>({
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().toLocaleString("default", { month: "short" }),
  selectedFilter: "Monthly", // Default filter
  setSelectedYear: () => {},
  setSelectedMonth: () => {},
  selectedCurrency: "PHP", // Default currency
  setSelectedCurrency: () => {},
  setSelectedFilter: () => {},
  selectedDateString: `${new Date().toLocaleString("default", {
    month: "short",
  })} ${new Date().getFullYear()}`,
});

// Create the provider component
export const DateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const currentMonthName = new Date().toLocaleString("default", {
    month: "short",
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>("Monthly"); // Add filter state
  const [selectedCurrency, setSelectedCurrency] = useState<string>("PHP"); // <-- Add currency state

  // Memoize the formatted date string to prevent unnecessary recalculations
  const selectedDateString = useMemo(() => {
    return `${selectedMonth} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // Memoize the context value including filter state and setter
  const value = useMemo(
    () => ({
      selectedYear,
      selectedMonth,
      setSelectedYear,
      setSelectedMonth,
      selectedDateString,
      selectedFilter, // Provide filter state
      setSelectedFilter, // Provide filter setter
      selectedCurrency, // <-- Provide currency state
      setSelectedCurrency, // <-- Provide currency setter
    }),
    [
      selectedYear,
      selectedMonth,
      selectedDateString,
      selectedFilter,
      selectedCurrency, // <-- Add currency to dependencies
    ]
  );

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

// Custom hook to use the DateContext
export const useDateContext = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};

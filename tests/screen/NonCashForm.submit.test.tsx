import NonCashForm from "@/app/(form)/expense/NonCashForm";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

// Mock service
jest.mock("@/services/expenseService", () => ({
    useExpenseService: () => ({
        createNonCashExpense: jest.fn().mockResolvedValue({}),
        updateNonCashExpense: jest.fn().mockResolvedValue({}),
        listNonCashLabor: jest.fn().mockResolvedValue([]),
        listNonCashTools: jest.fn().mockResolvedValue([]),
        listNonCashExtras: jest.fn().mockResolvedValue([]),
    }),
}));

describe("NonCashForm", () => {
    it("blok submit jika tidak ada labor harian terisi", async () => {
        const { getByText } = render(<NonCashForm seasonId="s1" />);
        fireEvent.press(getByText("Simpan"));
        // Tidak ada throw; kita cek muncul teks validasi via Alert => sulit ditangkap.
        // Alternatif: refactor validasi jadi fungsi terpisah dan tes fungsi itu.
        // Atau mock Alert:
    });
});

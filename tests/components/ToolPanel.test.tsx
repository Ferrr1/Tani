import ToolPanel from "@/components/ToolPanel";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const C = {
    icon: "#999",
    border: "#ddd",
    text: "#111",
    tint: "#00a",
    textMuted: "#666",
    danger: "#d00",
};

describe("ToolPanel", () => {
    it("menolak tambah jika semua field kosong", () => {
        const setTools = jest.fn();
        const { getByText } = render(<ToolPanel C={C} tools={[]} setTools={setTools} />);
        fireEvent.press(getByText("Tambah Alat"));
        expect(setTools).not.toHaveBeenCalled();
    });

    it("menambah item ketika minimal satu field valid", () => {
        const setTools = jest.fn((updater) => {
            const prev: any[] = [];
            updater(prev);
        });
        const { getByPlaceholderText, getByText } = render(
            <ToolPanel C={C} tools={[]} setTools={setTools} />
        );

        fireEvent.changeText(getByPlaceholderText("Nama alat"), "Cangkul");
        fireEvent.changeText(getByPlaceholderText("Jumlah"), "2");
        fireEvent.changeText(getByPlaceholderText("Harga beli"), "50000");

        fireEvent.press(getByText("Tambah Alat"));
        expect(setTools).toHaveBeenCalled();
    });
});

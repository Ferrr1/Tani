import { calcLaborSubtotal, sumChem } from "../calculate";
import { ChemItem, LaborForm } from "@/types/expense";

describe("calculate utils", () => {
  describe("calcLaborSubtotal", () => {
    it("should calculate borongan correctly", () => {
      const lf: LaborForm = {
        tipe: "borongan",
        hargaBorongan: "500000",
        jumlahOrang: "0",
        jumlahHari: "0",
        upahHarian: "0",
        jamKerja: "0",
      };
      expect(calcLaborSubtotal(lf)).toBe(500000);
    });

    it("should calculate harian correctly", () => {
      const lf: LaborForm = {
        tipe: "harian",
        hargaBorongan: "0",
        jumlahOrang: "2",
        jumlahHari: "3",
        upahHarian: "50000",
        jamKerja: "8",
      };
      expect(calcLaborSubtotal(lf)).toBe(300000);
    });

    it("should return 0 for invalid harian inputs", () => {
      const lf: LaborForm = {
        tipe: "harian",
        hargaBorongan: "0",
        jumlahOrang: "-1",
        jumlahHari: "3",
        upahHarian: "50000",
        jamKerja: "8",
      };
      expect(calcLaborSubtotal(lf)).toBe(0);
    });
  });

  describe("sumChem", () => {
    it("should sum multiple chemical items correctly", () => {
      const items: ChemItem[] = [
        { id: "1", category: "fertilizer", name: "A", qty: "2", price: "50000", unit: "kilogram" },
        { id: "2", category: "insecticide", name: "B", qty: "1", price: "25000", unit: "liter" },
      ];
      expect(sumChem(items)).toBe(125000);
    });

    it("should handle empty array", () => {
      expect(sumChem([])).toBe(0);
    });

    it("should ignore invalid values", () => {
      const items: ChemItem[] = [
        { id: "1", category: "fertilizer", name: "A", qty: "-1", price: "50000", unit: "kilogram" },
        { id: "2", category: "insecticide", name: "B", qty: "1", price: "-25000", unit: "liter" },
      ];
      expect(sumChem(items)).toBe(0);
    });
  });
});

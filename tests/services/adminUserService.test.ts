// useAdminUserService.updateUser.test.ts
import { supabase as supabaseMock } from "@/lib/supabase";
import { useAdminUserService } from "@/services/adminUserService";

describe("useAdminUserService.updateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("memanggil edge function & rpc sesuai input", async () => {
    // Arrange
    // pastikan invoke ter-resolve ok
    (supabaseMock.functions.invoke as unknown as jest.Mock).mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const { updateUser } = useAdminUserService();

    // Act
    await updateUser({
      targetUserId: "u2",
      newEmail: "x@a.com",
      newPassword: "secret12",
      newFullName: "X",
      newNamaDesa: "Y",
      newLuasLahan: 1.5,
      newRole: "admin",
    });

    // Assert
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "admin-update-user",
      {
        body: {
          targetUserId: "u2",
          newEmail: "x@a.com",
          newPassword: "secret12",
        },
      }
    );

    expect(supabaseMock.rpc).toHaveBeenCalledWith("admin_update_profile_only", {
      target_user_id: "u2",
      new_full_name: "X",
      new_nama_desa: "Y",
      new_luas_lahan: 1.5,
      new_role: "admin",
    });
  });

  it("tidak memanggil edge function jika email & password kosong", async () => {
    const { updateUser } = useAdminUserService();

    await updateUser({
      targetUserId: "u2",
      newFullName: "X",
      newNamaDesa: "Y",
      newLuasLahan: 2,
      newRole: "user",
    });

    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
  });
});

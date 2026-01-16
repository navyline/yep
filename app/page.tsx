import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const cookieStore = await cookies();
  const userName = cookieStore.get("user_session")?.value;
  const userRole = cookieStore.get("user_role")?.value;
  const params = await searchParams;

  // --- 1. ฟังก์ชันสมัครสมาชิก ---
  async function handleSignUp(formData: FormData) {
    "use server";
    const fname = formData.get("firstname");
    const lname = formData.get("lastname");
    const user = formData.get("username");
    const pass = formData.get("password");

    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [user as string]
    });

    if (existingUser.rows.length > 0) {
      redirect("/?mode=register&error=duplicate");
    }

    try {
      await db.execute({
        sql: "INSERT INTO users (firstname, lastname, username, password, role) VALUES (?, ?, ?, ?, 'user')",
        args: [fname as string, lname as string, user as string, pass as string]
      });
      redirect("/?mode=login&success=registered");
    } catch (e) {
      redirect("/?mode=register&error=failed");
    }
  }

  // --- 2. ฟังก์ชันล็อกอิน ---
  async function handleLogin(formData: FormData) {
    "use server";
    const user = formData.get("username") as string;
    const pass = formData.get("password") as string;

    const rs = await db.execute({
      sql: "SELECT * FROM users WHERE username = ? AND password = ?",
      args: [user, pass]
    });

    if (rs.rows.length > 0) {
      const userData = rs.rows[0];
      (await cookies()).set("user_session", String(userData.username));
      (await cookies()).set("user_role", String(userData.role));
      (await cookies()).set("user_fullname", `${userData.firstname} ${userData.lastname}`);
      redirect("/");
    } else {
      redirect("/?mode=login&error=invalid");
    }
  }

  // --- 3. ฟังก์ชันสำหรับ ADMIN: ลบสมาชิก ---
  async function handleDelete(id: number) {
    "use server";
    if ((await cookies()).get("user_role")?.value !== "admin") return;
    await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
    redirect("/");
  }

  // --- 4. ฟังก์ชันสำหรับ ADMIN: แก้ไขระดับสิทธิ์ ---
  async function handleUpdateRole(formData: FormData) {
    "use server";
    if ((await cookies()).get("user_role")?.value !== "admin") return;
    
    const id = formData.get("userId");
    const newRole = formData.get("role");
    
    await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [newRole as string, Number(id)]
    });
    redirect("/");
  }

  const allUsers = userRole === "admin" 
    ? (await db.execute("SELECT * FROM users")).rows 
    : [];

  const isRegister = params.mode === "register";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
      {!userName ? (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <h1 className="text-3xl font-black text-center text-blue-600 mb-2">005 Natakorn Wongthi</h1>
          <p className="text-center text-slate-400 mb-8">
            {isRegister ? "สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน" : "ยินดีต้อนรับกลับมา กรุณาเข้าสู่ระบบ"}
          </p>

          {params.error === "duplicate" && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center font-bold font-sans">❌ ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว</div>}
          {params.success === "registered" && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm mb-4 text-center font-bold font-sans">✅ สมัครสมาชิกสำเร็จ!</div>}

          {isRegister ? (
            <form action={handleSignUp} className="space-y-4">
               <div className="grid grid-cols-2 gap-4 text-sans">
                  <div>
                    <label className="text-xs font-bold text-slate-400 ml-1">ชื่อจริง</label>
                    <input name="firstname" placeholder="ชื่อจริง" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 ml-1">นามสกุล</label>
                    <input name="lastname" placeholder="นามสกุล" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">ชื่อผู้ใช้งาน (Username)</label>
                  <input name="username" placeholder="Username" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">รหัสผ่าน (Password)</label>
                  <input name="password" type="password" placeholder="••••••••" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all">สมัครสมาชิก</button>
               <p className="text-center text-sm mt-4">มีบัญชีแล้ว? <a href="/?mode=login" className="text-blue-600 font-bold">เข้าสู่ระบบ</a></p>
            </form>
          ) : (
            <form action={handleLogin} className="space-y-6">
               <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">ชื่อผู้ใช้งาน</label>
                  <input name="username" placeholder="Username" required className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">รหัสผ่าน</label>
                  <input name="password" type="password" placeholder="••••••••" required className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
               </div>
               <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">เข้าสู่ระบบ</button>
               <p className="text-center text-sm mt-6">ยังไม่มีบัญชี? <a href="/?mode=register" className="text-blue-600 font-bold">สร้างบัญชีใหม่</a></p>
            </form>
          )}
        </div>
      ) : (
        <div className="w-full max-w-5xl">
          <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold">สวัสดี, คุณ {cookieStore.get("user_fullname")?.value}</h2>
              <p className="text-slate-400 text-sm">สิทธิ์ของคุณคือ: <span className="text-blue-600 font-black tracking-widest">{userRole?.toUpperCase()}</span></p>
            </div>
            <form action={async () => { "use server"; (await cookies()).delete("user_session"); (await cookies()).delete("user_role"); (await cookies()).delete("user_fullname"); redirect("/"); }}>
              <button className="bg-red-50 text-red-600 px-5 py-2.5 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all">ออกจากระบบ</button>
            </form>
          </header>

          {userRole === "admin" && (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-700 underline decoration-blue-500 underline-offset-8">จัดการสมาชิกทั้งหมด</h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-full">พบสมาชิก {allUsers.length} ท่าน</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-[11px] uppercase tracking-widest font-black border-b border-slate-50">
                      <th className="p-6">ชื่อ-นามสกุล</th>
                      <th className="p-6">ชื่อผู้ใช้งาน</th>
                      <th className="p-6">ระดับสิทธิ์</th>
                      <th className="p-6 text-right font-sans">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-blue-50/40 transition-all group">
                        <td className="p-6 font-bold text-slate-700 font-sans">
                          {u.firstname} {u.lastname}
                          <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-tighter">ID: #{u.id}</div>
                        </td>
                        <td className="p-6">
                           <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-black font-sans">{u.username}</span>
                        </td>
                        <td className="p-6 font-sans">
                          {/* แก้ไขส่วนจัดการสิทธิ์: เปลี่ยนจาก onChange เป็นฟอร์มแบบสมบูรณ์เพื่อเลี่ยง Error */}
                          <form action={handleUpdateRole} className="flex items-center gap-2 font-sans">
                            <input type="hidden" name="userId" value={u.id} />
                            <select 
                              name="role"
                              defaultValue={u.role}
                              className="bg-white border border-slate-200 text-xs font-black rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                              <option value="user">USER</option>
                              <option value="admin">ADMIN</option>
                            </select>
                            <button type="submit" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold hover:bg-blue-600 hover:text-white transition-colors font-sans">
                              บันทึก
                            </button>
                          </form>
                        </td>
                        <td className="p-6 text-right font-sans">
                          <form action={async () => { "use server"; await handleDelete(u.id); }}>
                            <button 
                              className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-600 hover:text-white transition-all inline-flex items-center font-sans"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                              <span className="ml-1 text-xs font-bold font-sans">ลบสมาชิก</span>
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {userRole !== "admin" && (
            <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-200 text-center shadow-sm font-sans">
              <h3 className="text-2xl font-bold text-slate-800 mb-2 font-sans">ยินดีต้อนรับเข้าสู่ระบบ</h3>
              <p className="text-slate-400 font-sans">คุณเข้าใช้งานในฐานะสมาชิกทั่วไป จึงไม่มีสิทธิ์เข้าถึงส่วนจัดการสมาชิก</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
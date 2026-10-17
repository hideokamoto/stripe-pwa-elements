// stripe-payment-sheet 仕様案 v1（公開ページの記述をそのまま形式化したもの）
// 仕様に書かれていない遷移は「起きない（無視される）」と解釈している。
module sheet_v1 {
  type Phase = Idle | Loading | Ready | LoadFailed | Presented | Confirming | Completed

  type Confirm = { gen: int, method: str, kind: str }

  pure val MAX_GEN = 3

  var phase: Phase
  var gen: int                 // 初期化の世代
  var secretKind: str          // "none" | "pi" | "seti"（intent-client-secret のプレフィックス）
  var intentType: str          // "payment" | "setup"（intent-type 属性）
  var inits: Set[int]          // 実行中の初期化処理
  var confirms: Set[Confirm]   // 実行中の confirmPayment / confirmSetup
  var resolver: bool           // present() の Promise を解決する関数を保持しているか
  var orphans: int             // 解決手段を失った present() の Promise の数
  var stripeSucceeded: int     // Stripe 側で確定に成功した回数
  var completedEmitted: int    // paymentSheetCompleted を発火した回数
  var failedEmitted: int       // paymentSheetFailed を発火した回数
  var mismatchConfirm: bool    // secret の種類と合わない確定メソッドを呼んだか

  action init = all {
    phase' = Idle, gen' = 0, secretKind' = "none", intentType' = "payment",
    inits' = Set(), confirms' = Set(), resolver' = false, orphans' = 0,
    stripeSucceeded' = 0, completedEmitted' = 0, failedEmitted' = 0, mismatchConfirm' = false,
  }

  // intent-client-secret 属性の設定・変更（仕様: どの状態からでも loading へ）
  action setSecret = {
    nondet k = Set("pi", "seti").oneOf()
    all {
      gen < MAX_GEN,
      gen' = gen + 1, secretKind' = k, inits' = inits.union(Set(gen + 1)), phase' = Loading,
      intentType' = intentType, confirms' = confirms, resolver' = resolver, orphans' = orphans,
      stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
      failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
    }
  }

  // intent-type 属性の変更
  action setIntentType = {
    nondet t = Set("payment", "setup").oneOf()
    all {
      intentType' = t,
      phase' = phase, gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms,
      resolver' = resolver, orphans' = orphans, stripeSucceeded' = stripeSucceeded,
      completedEmitted' = completedEmitted, failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
    }
  }

  // 初期化処理の完了（古い世代の結果は捨てる）
  action loadResult = {
    nondet g = inits.oneOf()
    nondet ok = Set(true, false).oneOf()
    all {
      inits.size() > 0,
      inits' = inits.exclude(Set(g)),
      phase' = if (g == gen and phase == Loading) (if (ok) Ready else LoadFailed) else phase,
      gen' = gen, secretKind' = secretKind, intentType' = intentType, confirms' = confirms,
      resolver' = resolver, orphans' = orphans, stripeSucceeded' = stripeSucceeded,
      completedEmitted' = completedEmitted, failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
    }
  }

  // present()（仕様: ready -> presented。それ以外の状態での挙動は未定義なので遷移しない）
  action present = all {
    resolver' = true,
    orphans' = if (resolver) orphans + 1 else orphans,   // 解決関数の上書き
    phase' = if (phase == Ready) Presented else phase,
    gen' = gen, secretKind' = secretKind, intentType' = intentType, inits' = inits, confirms' = confirms,
    stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
    failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
  }

  // open 属性を true にする
  action openAttr = all {
    phase == Ready, phase' = Presented,
    gen' = gen, secretKind' = secretKind, intentType' = intentType, inits' = inits, confirms' = confirms,
    resolver' = resolver, orphans' = orphans, stripeSucceeded' = stripeSucceeded,
    completedEmitted' = completedEmitted, failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
  }

  // 閉じる操作（閉じるボタン / ESC / open=false / dismiss()）。仕様: presented -> ready で Canceled
  action close = all {
    phase == Presented, phase' = Ready, resolver' = false,
    gen' = gen, secretKind' = secretKind, intentType' = intentType, inits' = inits, confirms' = confirms,
    orphans' = orphans, stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
    failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
  }

  // 送信。intent-type に従って confirmPayment / confirmSetup を呼ぶ
  action submit = all {
    phase == Presented, phase' = Confirming,
    confirms' = confirms.union(Set({ gen: gen, method: intentType, kind: secretKind })),
    mismatchConfirm' = (mismatchConfirm or ((intentType == "payment") != (secretKind == "pi"))),
    gen' = gen, secretKind' = secretKind, intentType' = intentType, inits' = inits,
    resolver' = resolver, orphans' = orphans, stripeSucceeded' = stripeSucceeded,
    completedEmitted' = completedEmitted, failedEmitted' = failedEmitted,
  }

  // 確定処理の結果。メソッドと secret の種類が合わなければ Stripe はエラーを返す
  action confirmResult = {
    nondet c = confirms.oneOf()
    nondet approved = Set(true, false).oneOf()   // false = カード拒否など再入力できるエラー
    val success = approved and ((c.method == "payment") == (c.kind == "pi"))
    val current = phase == Confirming and c.gen == gen
    all {
      confirms.size() > 0,
      confirms' = confirms.exclude(Set(c)),
      stripeSucceeded' = if (success) stripeSucceeded + 1 else stripeSucceeded,
      // 仕様: confirming -> completed / confirming -> presented。古い確定結果の扱いは未定義なので無視
      phase' = if (current) (if (success) Completed else Presented) else phase,
      completedEmitted' = if (current and success) completedEmitted + 1 else completedEmitted,
      resolver' = if (current and success) false else resolver,
      gen' = gen, secretKind' = secretKind, intentType' = intentType, inits' = inits,
      orphans' = orphans, failedEmitted' = failedEmitted, mismatchConfirm' = mismatchConfirm,
    }
  }

  action step = any { setSecret, setIntentType, loadResult, present, openAttr, close, submit, confirmResult }

  // ---- 守るべき性質 ----
  // 性質1: present() の Promise が解決手段を失わない
  val noOrphanPromise = orphans == 0
  // 性質2: 解決待ちの Promise があるなら、シートは表示中か確定処理中（そうでなければ永久に待つ）
  val pendingImpliesVisible = resolver implies (phase == Presented or phase == Confirming)
  // 性質3: Stripe 側で成功した確定は、必ず Completed として通知される
  val successIsReported = stripeSucceeded == completedEmitted
  // 性質4: secret の種類と合う確定メソッドだけを呼ぶ
  val methodMatchesSecret = not(mismatchConfirm)
  // 到達可能性の確認: Failed が一度でも発火するか（成り立ち続けるなら Failed は到達不能）
  val failedNeverEmitted = failedEmitted == 0
}

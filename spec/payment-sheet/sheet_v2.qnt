// stripe-payment-sheet 仕様案 v2（v1 の反例を受けて修正したもの）
// 変更点:
//  - intent-type を廃止。確定メソッドは secret のプレフィックスから決める（pi_ / seti_ 以外は読み込み失敗）
//  - present() は Promise を1つしか持たない。表示中・確定処理中に呼ばれたら同じ Promise を返す
//  - 読み込み中の present() は、読み込み成功で表示し、失敗なら Failed で解決する
//  - 表示できない状態（LoadFailed / Completed / Errored）の present() は即座に Failed で解決する
//  - 確定処理中は secret の変更を保留する（モデルでは確定処理中の変更を不可とする）
//  - 表示中に secret が変わったら、Canceled で解決して閉じてから読み込み直す
//  - 再入力できないエラー（intent が使えない状態など）で Failed を発火して Errored に移る
module sheet_v2 {
  type Phase = Idle | Loading | Ready | LoadFailed | Presented | Confirming | Completed | Errored

  type Confirm = { gen: int, method: str, kind: str }

  pure val MAX_GEN = 3

  var phase: Phase
  var gen: int
  var secretKind: str          // "none" | "pi" | "seti" | "other"
  var inits: Set[int]
  var confirms: Set[Confirm]
  var pending: bool            // 未解決の present() Promise があるか（常に最大1つ）
  var wantOpen: bool           // 読み込み完了後に表示する予約
  var created: int             // 作られた Promise の数
  var resolved: int            // 解決された Promise の数
  var stripeSucceeded: int
  var completedEmitted: int
  var canceledEmitted: int
  var failedEmitted: int
  var mismatchConfirm: bool
  var canceledAfterCompleted: bool
  var completedGen: int        // 完了した決済の世代（未完了なら -1）

  // secret のプレフィックスから確定メソッドを決める
  pure def methodOf(k: str): str = if (k == "pi") "payment" else "setup"

  action init = all {
    phase' = Idle, gen' = 0, secretKind' = "none", inits' = Set(), confirms' = Set(),
    pending' = false, wantOpen' = false, created' = 0, resolved' = 0,
    stripeSucceeded' = 0, completedEmitted' = 0, canceledEmitted' = 0, failedEmitted' = 0,
    mismatchConfirm' = false, canceledAfterCompleted' = false, completedGen' = -1,
  }

  action unchangedCounters = all {
    stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
    mismatchConfirm' = mismatchConfirm,
  }

  // secret の設定・変更。確定処理中は受け付けない（実装では確定完了まで保留）
  action setSecret = {
    nondet k = Set("pi", "seti", "other").oneOf()
    val wasPresented = phase == Presented
    all {
      gen < MAX_GEN,
      phase != Confirming,
      gen' = gen + 1, secretKind' = k, inits' = inits.union(Set(gen + 1)), phase' = Loading,
      confirms' = confirms,
      // 表示中なら Canceled で解決して閉じる
      pending' = if (wasPresented) false else pending,
      resolved' = if (wasPresented and pending) resolved + 1 else resolved,
      canceledEmitted' = if (wasPresented) canceledEmitted + 1 else canceledEmitted,
      canceledAfterCompleted' = (canceledAfterCompleted or (wasPresented and completedGen == gen)),
      completedGen' = completedGen,
      wantOpen' = if (wasPresented) false else wantOpen,
      created' = created, failedEmitted' = failedEmitted,
      unchangedCounters,
    }
  }

  // 初期化の完了。プレフィックスが pi_ / seti_ 以外なら失敗扱い
  action loadResult = {
    nondet g = inits.oneOf()
    nondet ok0 = Set(true, false).oneOf()
    val ok = ok0 and (secretKind == "pi" or secretKind == "seti")
    val current = g == gen and phase == Loading
    all {
      inits.size() > 0,
      inits' = inits.exclude(Set(g)),
      phase' = if (current) (if (ok) (if (wantOpen) Presented else Ready) else LoadFailed) else phase,
      wantOpen' = if (current) false else wantOpen,
      // 読み込み失敗で、表示を待っていた Promise は Failed で解決
      pending' = if (current and not(ok)) false else pending,
      resolved' = if (current and not(ok) and pending) resolved + 1 else resolved,
      failedEmitted' = failedEmitted,   // 読み込み失敗は paymentSheetFailedToLoad を発火し、Promise は Failed で解決する
      gen' = gen, secretKind' = secretKind, confirms' = confirms, created' = created,
      canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
      unchangedCounters,
    }
  }

  // present()
  action present = {
    val reuse = pending                                   // 既存の Promise を返す
    val terminal = phase == LoadFailed or phase == Completed or phase == Errored
    all {
      created' = if (reuse) created else created + 1,
      // 表示できない状態なら即座に Failed で解決
      pending' = if (reuse) true else not(terminal),
      resolved' = if (not(reuse) and terminal) resolved + 1 else resolved,
      failedEmitted' = failedEmitted,   // 表示できない状態の present() は Promise を Failed で解決するだけで、イベントは発火しない
      phase' = if (phase == Ready) Presented else phase,
      wantOpen' = if (phase == Idle or phase == Loading) true else wantOpen,
      gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms,
      canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
      unchangedCounters,
    }
  }

  // open 属性を true にする（Promise は作らない）
  action openAttr = all {
    phase == Ready, phase' = Presented,
    gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms, pending' = pending,
    wantOpen' = wantOpen, created' = created, resolved' = resolved, failedEmitted' = failedEmitted,
    canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
    unchangedCounters,
  }

  // 閉じる操作（閉じるボタン / 背景 / ESC / open=false）。確定処理中は不可
  action close = all {
    phase == Presented, phase' = Ready,
    pending' = false,
    resolved' = if (pending) resolved + 1 else resolved,
    canceledEmitted' = canceledEmitted + 1,
    canceledAfterCompleted' = (canceledAfterCompleted or completedGen == gen),
    completedGen' = completedGen,
    gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms,
    wantOpen' = wantOpen, created' = created, failedEmitted' = failedEmitted,
    unchangedCounters,
  }

  // 送信。メソッドは secret のプレフィックスから決まる
  action submit = all {
    phase == Presented, phase' = Confirming,
    confirms' = confirms.union(Set({ gen: gen, method: methodOf(secretKind), kind: secretKind })),
    mismatchConfirm' = (mismatchConfirm or (methodOf(secretKind) == "payment") != (secretKind == "pi")),
    gen' = gen, secretKind' = secretKind, inits' = inits, pending' = pending, wantOpen' = wantOpen,
    created' = created, resolved' = resolved, failedEmitted' = failedEmitted,
    canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
    stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
  }

  // 確定結果: 成功 / 再入力できるエラー / 再入力できないエラー
  action confirmResult = {
    nondet c = confirms.oneOf()
    nondet outcome = Set("approved", "declined", "fatal").oneOf()
    val success = outcome == "approved" and ((c.method == "payment") == (c.kind == "pi"))
    val fatal = outcome == "fatal"
    val current = phase == Confirming and c.gen == gen
    all {
      confirms.size() > 0,
      confirms' = confirms.exclude(Set(c)),
      stripeSucceeded' = if (success) stripeSucceeded + 1 else stripeSucceeded,
      phase' = if (current) (if (success) Completed else if (fatal) Errored else Presented) else phase,
      completedEmitted' = if (current and success) completedEmitted + 1 else completedEmitted,
      failedEmitted' = if (current and fatal and not(success)) failedEmitted + 1 else failedEmitted,
      pending' = if (current and (success or fatal)) false else pending,
      resolved' = if (current and (success or fatal) and pending) resolved + 1 else resolved,
      gen' = gen, secretKind' = secretKind, inits' = inits, wantOpen' = wantOpen, created' = created,
      canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted,
      completedGen' = if (current and success) gen else completedGen,
      mismatchConfirm' = mismatchConfirm,
    }
  }

  action step = any { setSecret, loadResult, present, openAttr, close, submit, confirmResult }

  // ---- 守るべき性質 ----
  // 性質1: present() の Promise は解決手段を失わない（作成数 = 解決数 + 未解決の1つ以下）
  val noOrphanPromise = created == resolved + (if (pending) 1 else 0)
  // 性質2: 未解決の Promise があるなら、表示中・確定処理中・表示予約付きの読み込み中のどれか
  val pendingImpliesProgress =
    pending implies (phase == Presented or phase == Confirming or ((phase == Loading or phase == Idle) and wantOpen))
  // 性質3: Stripe 側で成功した確定は必ず Completed として通知される
  val successIsReported = stripeSucceeded == completedEmitted
  // 性質4: secret の種類と合う確定メソッドだけを呼ぶ
  val methodMatchesSecret = not(mismatchConfirm)
  // 性質5: 同じ決済（同じ世代）の中で、完了後に Canceled を発火しない
  val noCancelAfterComplete = not(canceledAfterCompleted)
  // 到達可能性の確認用（違反が見つかれば Failed は到達可能）
  val failedNeverEmitted = failedEmitted == 0
  val allProps = noOrphanPromise and pendingImpliesProgress and successIsReported and methodMatchesSecret and noCancelAfterComplete
}

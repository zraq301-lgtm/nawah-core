// 🚀 الدالة الكبرى المدمجة للترحيل الذكي (BOM أو مرن) متوافقة تماماً مع React
  const handleProcessProduction = async () => {
    const timestamp = Date.now();
    let consumedItemsQueue = [];
    let producedItemsQueue = [];
    let totalMaterialsCost = 0;
    let targetDetailsText = "";

    // التحقق من وجود البيانات الأساسية لمنع أخطاء الـ Undefined في ريأكت
    if (!itemsList || itemsList.length === 0) {
      alert("⚠️ لا توجد بيانات مخزون متاحة حالياً، يرجى تحديث الصفحة.");
      return;
    }

    try {
      // ----------------------------------------------------
      // 🛡️ المسار الأول: نظام التصنيع القياسي الصارم المستند إلى BOM
      // ----------------------------------------------------
      if (isStrictBOMMode) {
        if (!bomsList || bomsList.length === 0) {
          alert("⚠️ لا توجد معادلات إنتاج (BOM) مسجلة بالنظام لتشغيل هذا الوضع.");
          return;
        }

        for (const [productId, rawValue] of Object.entries(productsInputs || {})) {
          const produceQty = rawValue === '' ? 0 : parseFloat(rawValue);
          if (produceQty <= 0) continue;

          const productItem = itemsList.find(s => s.id.toString() === productId.toString());
          if (!productItem) continue;

          targetDetailsText += `[${productItem.name}: كمية ${produceQty}] `;

          producedItemsQueue.push({
            item_id: productItem.id,
            quantity: produceQty,
            unit_price: 0 
          });

          // البحث عن معادلة الإنتاج الجاهزة
          const productBom = bomsList.find(b => b.product_id.toString() === productId.toString());
          
          if (productBom && productBom.ingredients) {
            for (const ingredient of productBom.ingredients) {
              const calculatedRequiredQty = (produceQty / parseFloat(productBom.base_quantity || 1)) * parseFloat(ingredient.required_quantity);
              const rawItem = itemsList.find(s => s.id.toString() === ingredient.raw_material_id.toString());
              if (!rawItem) continue;

              const availableQty = parseFloat(rawItem.available_quantity || 0);
              const costPrice = parseFloat(rawItem.cost_price || 0);

              if (availableQty < calculatedRequiredQty) {
                alert(`⚠️ خطأ نظام صارم: عجز في المخزن للمادة الخام (${rawItem.name})\nالمطلوب تلقائياً: ${calculatedRequiredQty.toFixed(2)} | المتوفر: ${availableQty}`);
                return;
              }

              totalMaterialsCost += (calculatedRequiredQty * costPrice);
              consumedItemsQueue.push({
                item_id: rawItem.id,
                quantity: calculatedRequiredQty,
                unit_price: costPrice
              });
            }
          } else {
            alert(`⚠️ النظام القياسي يمنع الإنتاج بدون معادلة! المنتج (${productItem.name}) ليس له BOM معرفة.`);
            return;
          }
        }

        if (producedItemsQueue.length === 0) {
          alert("⚠️ يرجى تحديد كمية المنتج التام المراد إنتاجه أولاً.");
          return;
        }

        const totalUnits = producedItemsQueue.reduce((acc, curr) => acc + curr.quantity, 0);
        const costPerUnit = totalUnits > 0 ? (totalMaterialsCost / totalUnits) : 0;
        producedItemsQueue.forEach(p => {
          p.unit_price = parseFloat(costPerUnit.toFixed(2));
        });

      } 
      // ----------------------------------------------------
      // 🔄 المسار الثاني: النظام المرن الحالي (يدوي وحر)
      // ----------------------------------------------------
      else {
        // تجميع يدوي للمواد الخام المستهلكة
        for (const [itemId, rawValue] of Object.entries(ingredientsInputs || {})) {
          const requiredQty = rawValue === '' ? 0 : parseFloat(rawValue);
          if (requiredQty <= 0) continue;
          
          const stockItem = itemsList.find(s => s.id.toString() === itemId.toString());
          if (!stockItem) continue;

          const availableQty = parseFloat(stockItem.available_quantity || 0);
          const costPrice = parseFloat(stockItem.cost_price || 0);

          if (availableQty < requiredQty) {
            alert(`⚠️ عجز في المادة الخام: ${stockItem.name}\nالمطلوب: ${requiredQty} | المتوفر: ${availableQty}`);
            return;
          }

          totalMaterialsCost += (requiredQty * costPrice);
          consumedItemsQueue.push({ item_id: stockItem.id, quantity: requiredQty, unit_price: costPrice });
        }

        // تجميع يدوي للمنتجات التامة
        let totalEnteredQuantity = 0;
        for (const [itemId, rawValue] of Object.entries(productsInputs || {})) {
          const quantity = rawValue === '' ? 0 : parseFloat(rawValue);
          if (quantity <= 0) continue;

          const stockItem = itemsList.find(s => s.id.toString() === itemId.toString());
          if (!stockItem) continue;

          const targetValue = targetInputs?.[itemId] || 0;
          const targetQty = targetValue === '' ? 0 : parseFloat(targetValue);
          targetDetailsText += `[${stockItem.name}: مطلوب ${targetQty} -> تم ${quantity}] `;

          totalEnteredQuantity += quantity;
          producedItemsQueue.push({ item_id: stockItem.id, quantity: quantity, unit_price: 0 });
        }

        if (consumedItemsQueue.length === 0 && producedItemsQueue.length === 0) {
          alert("⚠️ يرجى إدخال كميات (إما مواد خام مستهلكة أو منتجات تامة منفذة) لإتمام عملية الترحيل في الوضع المرن.");
          return;
        }

        const costPerUnit = totalEnteredQuantity > 0 ? (totalMaterialsCost / totalEnteredQuantity) : 0;
        producedItemsQueue.forEach(p => {
          const stockItem = itemsList.find(s => s.id.toString() === p.item_id.toString());
          p.unit_price = costPerUnit > 0 ? parseFloat(costPerUnit.toFixed(2)) : parseFloat(stockItem?.cost_price || 0);
        });
      }

      // ----------------------------------------------------
      // 🟩 ترحيل الفواتير السحابية الموحدة (Transactions)
      // ----------------------------------------------------
      
      // 1️⃣ إنشاء مستند صرف الخامات (sale) إذا توفرت خامات
      let saleInvoiceNumber = "N/A";
      if (consumedItemsQueue.length > 0) {
        saleInvoiceNumber = isStrictBOMMode ? `RAW-AUTO-${timestamp}` : `RAW-OUT-${timestamp}`;
        const saleInvoiceRes = await apiService.postData('invoices', {
          invoice_number: saleInvoiceNumber,
          invoice_type: 'sale',
          contact_id: 1, 
          gross_amount: totalMaterialsCost,
          net_amount: totalMaterialsCost,
          paid_amount: totalMaterialsCost,
          remaining_amount: 0,
          description: isStrictBOMMode 
            ? `خصم خامات تلقائي قياسي (BOM) لإنتاج: ${targetDetailsText}`
            : `سحب خامات تشغيل إنتاج يدوي - وردية ${formData?.shift || 'عامة'} بتاريخ ${formData?.date || ''}`
        });

        const saleInvoiceId = saleInvoiceRes?.id || saleInvoiceRes?.data?.id;
        for (const rawItem of consumedItemsQueue) {
          await apiService.postData('invoice_items', {
            invoice_id: saleInvoiceId,
            item_id: rawItem.item_id,
            quantity: rawItem.quantity,
            unit_price: rawItem.unit_price
          });
        }
      }

      // 2️⃣ إنشاء مستند إيداع الإنتاج التام (purchase) إذا توفرت منتجات تامة
      let purchaseInvoiceNumber = "N/A";
      if (producedItemsQueue.length > 0) {
        purchaseInvoiceNumber = isStrictBOMMode ? `PROD-AUTO-${timestamp}` : `PROD-IN-${timestamp}`;
        const finalAmount = totalMaterialsCost > 0 ? totalMaterialsCost : producedItemsQueue.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
        
        const purchaseInvoiceRes = await apiService.postData('invoices', {
          invoice_number: purchaseInvoiceNumber,
          invoice_type: 'purchase',
          contact_id: 1,
          gross_amount: finalAmount,
          net_amount: finalAmount,
          paid_amount: finalAmount,
          remaining_amount: 0,
          description: isStrictBOMMode
            ? `إيداع آلي للمنتج التام بناءً على معادلة التصنيع المعتمدة BOM.`
            : `إيداع خط الإنتاج التام اليدوي - وردية ${formData?.shift || 'عامة'} بتاريخ ${formData?.date || ''}`
        });

        const purchaseInvoiceId = purchaseInvoiceRes?.id || purchaseInvoiceRes?.data?.id;
        for (const prodItem of producedItemsQueue) {
          await apiService.postData('invoice_items', {
            invoice_id: purchaseInvoiceId,
            item_id: prodItem.item_id,
            quantity: prodItem.quantity,
            unit_price: prodItem.unit_price
          });
        }
      }

      // تحديث السيرفر لإعادة قراءة الجرد المحدث في كاش التطبيق
      if (queryClient) {
        await queryClient.invalidateQueries({ queryKey: ['stock'] });
      }

      alert(isStrictBOMMode 
        ? `✅ [نظام ERP القياسي]: تم احتساب المعادلات وخصم الخامات وإيداع المنتج التام سحابياً بنجاح!`
        : `✅ [النظام المرن]: تم ترحيل كميات خط الإنتاج بنجاح!`
      );
      
      // تفريغ الحقول التفاعلية في ريأكت بأمان
      if (typeof setIngredientsInputs === 'function') setIngredientsInputs({});
      if (typeof setProductsInputs === 'function') setProductsInputs({});
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ عملية الترحيل الموحدة:", error);
      alert("🚨 فشل الترحيل السحابي، يرجى مراجعة اتصال السيرفر.");
    }
  };
